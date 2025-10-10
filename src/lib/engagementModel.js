// src/lib/engagementModel.js
// Use dynamic import to avoid circular dependency issues
let tf = null;

/**
 * Intent Prediction Model - Predicts patron intent to trigger appropriate action
 *
 * This lightweight neural network learns from historical session data to predict
 * what action the patron wants, enabling proactive intelligent responses.
 *
 * Input Features (12 total):
 * - proximityLevel (0-100)
 * - intent (one-hot: approaching, stopped, passing, ambient)
 * - confidence (0-100)
 * - gazeDirection (one-hot: looking-at-screen, looking-away, unknown)
 * - baseline proximity (0-100)
 * - threshold (0-100)
 *
 * Output (3 classes):
 * - ambient: Person nearby but not engaging → Play ambient music
 * - approaching: Person walking toward kiosk → Voice prompt (ElevenLabs)
 * - staring: Person staring at screen 15+ seconds → Employee check-in/out
 */

let model = null;
let modelLoaded = false;

/**
 * Lazy load TensorFlow.js to avoid circular dependency issues
 */
async function loadTensorFlow() {
  if (!tf) {
    try {
      tf = await import('@tensorflow/tfjs');
      console.log('[EngagementModel] TensorFlow.js loaded successfully');
    } catch (err) {
      console.error('[EngagementModel] Failed to load TensorFlow.js:', err);
      throw err;
    }
  }
  return tf;
}

/**
 * Initialize a new intent prediction model (3-class neural network)
 */
export async function createEngagementModel() {
  try {
    const tensorFlow = await loadTensorFlow();
    const inputShape = [12]; // 12 input features

    model = tensorFlow.sequential({
      layers: [
        // Input layer + first hidden layer
        tensorFlow.layers.dense({
          inputShape,
          units: 16,
          activation: 'relu',
          kernelInitializer: 'heNormal',
        }),
        // Dropout for regularization (prevent overfitting)
        tensorFlow.layers.dropout({ rate: 0.2 }),
        // Second hidden layer
        tensorFlow.layers.dense({
          units: 8,
          activation: 'relu',
          kernelInitializer: 'heNormal',
        }),
        // Output layer (3-class classification: ambient, approaching, staring)
        tensorFlow.layers.dense({
          units: 3,
          activation: 'softmax', // Output probabilities for 3 classes
        }),
      ],
    });

    // Compile model with Adam optimizer
    model.compile({
      optimizer: tensorFlow.train.adam(0.001), // Learning rate
      loss: 'categoricalCrossentropy', // Multi-class classification loss
      metrics: ['accuracy'],
    });

    console.log('[IntentModel] Model created successfully');
    model.summary();
    modelLoaded = true;

    return model;
  } catch (err) {
    console.error('[IntentModel] Error creating model:', err);
    throw err;
  }
}

/**
 * Prepare features from session data for model input
 */
export function prepareFeatures(session) {
  const features = [];

  // Feature 1: Proximity level (0-100)
  features.push(session.proximityLevel / 100);

  // Features 2-5: Intent (one-hot encoded)
  const intents = ['approaching', 'stopped', 'passing', 'ambient'];
  intents.forEach(intent => {
    features.push(session.intent === intent ? 1 : 0);
  });

  // Feature 6: Confidence (0-100)
  features.push(session.confidence / 100);

  // Features 7-9: Gaze direction (one-hot encoded)
  const gazeDirections = ['looking-at-screen', 'looking-away', 'unknown'];
  gazeDirections.forEach(dir => {
    features.push(session.gazeDirection === dir ? 1 : 0);
  });

  // Feature 10: Baseline proximity (0-100)
  features.push((session.baseline || 0) / 100);

  // Feature 11: Threshold (0-100)
  features.push((session.threshold || 30) / 100);

  return features;
}

/**
 * Train model on historical session data
 *
 * @param {Array} sessions - Array of session objects with triggeredAction ('ambient', 'approaching', 'staring')
 * @param {Object} options - Training options
 * @returns {Promise<Object>} Training history
 */
export async function trainModel(sessions, options = {}) {
  try {
    const tensorFlow = await loadTensorFlow();

    const {
      epochs = 50,
      batchSize = 32,
      validationSplit = 0.2,
    } = options;

    if (!model) {
      await createEngagementModel();
    }

    // Filter sessions with valid intent labels
    const labeledSessions = sessions.filter(s =>
      s.triggeredAction && ['ambient', 'approaching', 'staring'].includes(s.triggeredAction)
    );

    if (labeledSessions.length < 20) {
      console.warn('[IntentModel] Not enough training data. Need at least 20 labeled sessions.');
      return null;
    }

    console.log(`[IntentModel] Training on ${labeledSessions.length} sessions...`);

    // Prepare training data
    const X = labeledSessions.map(prepareFeatures);

    // Convert intent labels to one-hot encoding
    // ambient = [1, 0, 0], approaching = [0, 1, 0], staring = [0, 0, 1]
    const intentToOneHot = {
      'ambient': [1, 0, 0],
      'approaching': [0, 1, 0],
      'staring': [0, 0, 1],
    };
    const y = labeledSessions.map(s => intentToOneHot[s.triggeredAction]);

    // Convert to tensors
    const xsTensor = tensorFlow.tensor2d(X);
    const ysTensor = tensorFlow.tensor2d(y);

    // Train model
    const history = await model.fit(xsTensor, ysTensor, {
      epochs,
      batchSize,
      validationSplit,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`[IntentModel] Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
          }
        },
      },
    });

    // Cleanup tensors
    xsTensor.dispose();
    ysTensor.dispose();

    console.log('[IntentModel] Training complete!');
    const finalLoss = history.history.loss[history.history.loss.length - 1];
    const finalAcc = history.history.acc[history.history.acc.length - 1];
    console.log(`[IntentModel] Final loss: ${finalLoss.toFixed(4)}, accuracy: ${finalAcc.toFixed(4)}`);

    return history;
  } catch (err) {
    console.error('[IntentModel] Training error:', err);
    throw err;
  }
}

/**
 * Predict patron intent probabilities
 *
 * @param {Object} sessionData - Current proximity trigger data
 * @returns {Object} Intent probabilities { ambient, approaching, staring, predictedIntent }
 */
export async function predictEngagement(sessionData) {
  try {
    if (!model || !modelLoaded) {
      console.warn('[IntentModel] Model not loaded. Using baseline heuristic.');
      // Fallback: simple heuristic based on proximity and gaze
      const proximity = sessionData.proximityLevel || 50;
      const gaze = sessionData.gazeDirection || 'unknown';

      // Simple rules when model not available
      if (gaze === 'looking-at-screen' && proximity < 20) {
        return { ambient: 0.1, approaching: 0.3, staring: 0.6, predictedIntent: 'staring' };
      } else if (proximity < 30) {
        return { ambient: 0.2, approaching: 0.7, staring: 0.1, predictedIntent: 'approaching' };
      } else {
        return { ambient: 0.7, approaching: 0.2, staring: 0.1, predictedIntent: 'ambient' };
      }
    }

    const tensorFlow = await loadTensorFlow();
    const features = prepareFeatures(sessionData);
    const inputTensor = tensorFlow.tensor2d([features]);

    const prediction = model.predict(inputTensor);
    const probabilities = await prediction.data();

    // Cleanup
    inputTensor.dispose();
    prediction.dispose();

    // Convert to intent object
    const intents = ['ambient', 'approaching', 'staring'];
    const result = {
      ambient: probabilities[0],
      approaching: probabilities[1],
      staring: probabilities[2],
    };

    // Find highest probability intent
    const maxProb = Math.max(...probabilities);
    const maxIndex = probabilities.indexOf(maxProb);
    result.predictedIntent = intents[maxIndex];

    console.log('[IntentModel] Predictions:', result);

    return result;
  } catch (err) {
    console.error('[IntentModel] Prediction error:', err);
    // Fallback to heuristic on error
    return { ambient: 0.33, approaching: 0.33, staring: 0.34, predictedIntent: 'approaching' };
  }
}

/**
 * Save model to IndexedDB for persistence
 */
export async function saveModel() {
  try {
    if (!model) {
      console.warn('[EngagementModel] No model to save');
      return;
    }

    const saveResult = await model.save('indexeddb://engagement-model');
    console.log('[EngagementModel] Model saved to IndexedDB:', saveResult);
    return saveResult;
  } catch (err) {
    console.error('[EngagementModel] Error saving model:', err);
    throw err;
  }
}

/**
 * Load model from IndexedDB
 */
export async function loadModel() {
  try {
    const tensorFlow = await loadTensorFlow();
    model = await tensorFlow.loadLayersModel('indexeddb://engagement-model');
    modelLoaded = true;
    console.log('[EngagementModel] Model loaded from IndexedDB');
    return model;
  } catch (err) {
    console.log('[EngagementModel] No saved model found or error loading:', err.message);
    return null;
  }
}

/**
 * Retrain model with new session data (incremental learning)
 *
 * This is called periodically (e.g., every 100 new sessions) to improve the model
 */
export async function incrementalTrain(newSessions) {
  try {
    if (!model) {
      // First training - create model
      await trainModel(newSessions, { epochs: 50 });
      await saveModel();
    } else {
      // Incremental training - fewer epochs
      await trainModel(newSessions, { epochs: 10 });
      await saveModel();
    }
  } catch (err) {
    console.error('[EngagementModel] Incremental training error:', err);
    // Don't throw - let app continue even if training fails
  }
}

/**
 * Get model performance metrics on test data
 */
export async function evaluateModel(testSessions) {
  try {
    if (!model || !modelLoaded) {
      console.warn('[IntentModel] Model not loaded');
      return null;
    }

    const tensorFlow = await loadTensorFlow();

    const labeledSessions = testSessions.filter(s =>
      s.triggeredAction && ['ambient', 'approaching', 'staring'].includes(s.triggeredAction)
    );

    if (labeledSessions.length === 0) {
      return null;
    }

    const X = labeledSessions.map(prepareFeatures);

    // Convert to one-hot encoding
    const intentToOneHot = {
      'ambient': [1, 0, 0],
      'approaching': [0, 1, 0],
      'staring': [0, 0, 1],
    };
    const y = labeledSessions.map(s => intentToOneHot[s.triggeredAction]);

    const xsTensor = tensorFlow.tensor2d(X);
    const ysTensor = tensorFlow.tensor2d(y);

    const evaluation = model.evaluate(xsTensor, ysTensor);
    const loss = await evaluation[0].data();
    const accuracy = await evaluation[1].data();

    xsTensor.dispose();
    ysTensor.dispose();
    evaluation[0].dispose();
    evaluation[1].dispose();

    console.log(`[IntentModel] Evaluation - Loss: ${loss[0].toFixed(4)}, Accuracy: ${accuracy[0].toFixed(4)}`);

    return {
      loss: loss[0],
      accuracy: accuracy[0],
    };
  } catch (err) {
    console.error('[IntentModel] Evaluation error:', err);
    return null;
  }
}
