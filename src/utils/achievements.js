// src/utils/achievements.js
// Achievement/Badge system for games

export const ACHIEVEMENTS = {
  // Hotdog Game
  PERFECT_DOG: {
    id: 'perfect_dog',
    name: 'Perfect Dog',
    description: 'Assemble a hotdog with no mistakes',
    icon: '🌭',
    game: 'hotdog',
  },
  SPEED_DEMON: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete hotdog in under 30 seconds',
    icon: '⚡',
    game: 'hotdog',
  },
  NO_KETCHUP: {
    id: 'no_ketchup',
    name: 'True Chicagoan',
    description: 'Never place ketchup on a hotdog',
    icon: '🚫',
    game: 'hotdog',
  },

  // Trivia Game
  TRIVIA_MASTER: {
    id: 'trivia_master',
    name: 'Trivia Master',
    description: 'Answer all questions correctly',
    icon: '🧠',
    game: 'trivia',
  },
  SPEED_READER: {
    id: 'speed_reader',
    name: 'Speed Reader',
    description: 'Answer 5 questions in under 5 seconds each',
    icon: '📚',
    game: 'trivia',
  },
  CHICAGO_EXPERT: {
    id: 'chicago_expert',
    name: 'Chicago Expert',
    description: 'Score 100% accuracy on trivia',
    icon: '🏙️',
    game: 'trivia',
  },

  // Deep Dish Game
  PIZZA_MASTER: {
    id: 'pizza_master',
    name: 'Pizza Master',
    description: 'Collect all ingredients',
    icon: '🍕',
    game: 'deepdish',
  },
  COMBO_KING: {
    id: 'combo_king',
    name: 'Combo King',
    description: 'Achieve a 10x combo',
    icon: '🔥',
    game: 'deepdish',
  },
  NO_PINEAPPLE: {
    id: 'no_pineapple',
    name: 'No Pineapple',
    description: 'Avoid all pineapple pieces',
    icon: '🍍',
    game: 'deepdish',
  },

  // Wind Game
  WIND_MASTER: {
    id: 'wind_master',
    name: 'Wind Master',
    description: 'Complete game without losing popcorn',
    icon: '💨',
    game: 'wind',
  },
  PERFECT_TIMING: {
    id: 'perfect_timing',
    name: 'Perfect Timing',
    description: 'Dodge 10 wind gusts perfectly',
    icon: '⏱️',
    game: 'wind',
  },
  SURVIVOR: {
    id: 'survivor',
    name: 'Survivor',
    description: 'Complete game with at least half popcorn',
    icon: '🏆',
    game: 'wind',
  },
};

class AchievementManager {
  constructor() {
    this.unlockedAchievements = this.loadAchievements();
    this.callbacks = [];
  }

  loadAchievements() {
    try {
      const stored = localStorage.getItem('chipins_achievements');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  saveAchievements() {
    try {
      localStorage.setItem('chipins_achievements', JSON.stringify(this.unlockedAchievements));
    } catch (e) {
      console.error('Failed to save achievements:', e);
    }
  }

  unlock(achievementId) {
    if (!this.unlockedAchievements[achievementId]) {
      this.unlockedAchievements[achievementId] = {
        unlockedAt: Date.now(),
      };
      this.saveAchievements();

      const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === achievementId);
      if (achievement) {
        this.notifyUnlock(achievement);
      }

      return true;
    }
    return false;
  }

  isUnlocked(achievementId) {
    return !!this.unlockedAchievements[achievementId];
  }

  getUnlockedCount(game = null) {
    const unlocked = Object.keys(this.unlockedAchievements);
    if (!game) return unlocked.length;

    return unlocked.filter(id => {
      const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === id);
      return achievement && achievement.game === game;
    }).length;
  }

  getTotalCount(game = null) {
    if (!game) return Object.keys(ACHIEVEMENTS).length;

    return Object.values(ACHIEVEMENTS).filter(a => a.game === game).length;
  }

  getAchievementsForGame(game) {
    return Object.values(ACHIEVEMENTS).filter(a => a.game === game);
  }

  onUnlock(callback) {
    this.callbacks.push(callback);
  }

  notifyUnlock(achievement) {
    this.callbacks.forEach(cb => cb(achievement));
  }

  // Check achievement conditions for Hotdog Game
  checkHotdogAchievements(gameData) {
    const { mistakes, completionTime, usedKetchup } = gameData;

    if (mistakes === 0) {
      this.unlock('perfect_dog');
    }

    if (completionTime < 30000) {
      this.unlock('speed_demon');
    }

    if (!usedKetchup) {
      this.unlock('no_ketchup');
    }
  }

  // Check achievement conditions for Trivia Game
  checkTriviaAchievements(gameData) {
    const { correctCount, totalQuestions, quickAnswers, accuracy } = gameData;

    if (correctCount === totalQuestions) {
      this.unlock('trivia_master');
    }

    if (quickAnswers >= 5) {
      this.unlock('speed_reader');
    }

    if (accuracy === 100) {
      this.unlock('chicago_expert');
    }
  }

  // Check achievement conditions for Deep Dish Game
  checkDeepDishAchievements(gameData) {
    const { collectedAll, maxCombo, caughtPineapple } = gameData;

    if (collectedAll) {
      this.unlock('pizza_master');
    }

    if (maxCombo >= 10) {
      this.unlock('combo_king');
    }

    if (!caughtPineapple) {
      this.unlock('no_pineapple');
    }
  }

  // Check achievement conditions for Wind Game
  checkWindAchievements(gameData) {
    const { popcornLost, perfectDodges, finalPopcornCount, startingPopcornCount } = gameData;

    if (popcornLost === 0) {
      this.unlock('wind_master');
    }

    if (perfectDodges >= 10) {
      this.unlock('perfect_timing');
    }

    if (finalPopcornCount >= startingPopcornCount / 2) {
      this.unlock('survivor');
    }
  }

  reset() {
    this.unlockedAchievements = {};
    this.saveAchievements();
  }
}

// Create singleton instance
const achievementManager = new AchievementManager();

export default achievementManager;
