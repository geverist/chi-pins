// src/utils/particleEffects.js
// Lightweight particle effect system for visual feedback

export const createParticleEffect = (x, y, config = {}) => {
  const {
    count = 20,
    colors = ['#3b82f6', '#60a5fa', '#93c5fd'],
    size = 8,
    speed = 3,
    lifetime = 1000,
    emoji = null,
  } = config;

  const particles = [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const velocity = {
      x: Math.cos(angle) * speed * (0.5 + Math.random() * 0.5),
      y: Math.sin(angle) * speed * (0.5 + Math.random() * 0.5),
    };

    const particle = document.createElement('div');
    particle.style.position = 'fixed';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '9999';
    particle.style.transition = `all ${lifetime}ms ease-out`;

    if (emoji) {
      particle.textContent = emoji;
      particle.style.fontSize = `${size * 2}px`;
      particle.style.backgroundColor = 'transparent';
    }

    document.body.appendChild(particle);

    // Trigger animation
    requestAnimationFrame(() => {
      particle.style.transform = `translate(${velocity.x * 50}px, ${velocity.y * 50}px)`;
      particle.style.opacity = '0';
    });

    particles.push({ element: particle, velocity, lifetime });
  }

  // Cleanup after animation
  setTimeout(() => {
    particles.forEach(p => p.element.remove());
  }, lifetime);

  return particles;
};

export const createSuccessEffect = (x, y) => {
  createParticleEffect(x, y, {
    count: 15,
    colors: ['#10b981', '#34d399', '#6ee7b7'],
    size: 6,
    speed: 4,
    lifetime: 800,
  });
};

export const createErrorEffect = (x, y) => {
  createParticleEffect(x, y, {
    count: 10,
    colors: ['#ef4444', '#f87171', '#fca5a5'],
    size: 8,
    speed: 3,
    lifetime: 600,
  });
};

export const createCoinEffect = (x, y) => {
  createParticleEffect(x, y, {
    count: 8,
    emoji: '✨',
    size: 8,
    speed: 2,
    lifetime: 1000,
  });
};

export const createComboEffect = (x, y, level = 1) => {
  const sizes = [8, 12, 16, 20, 24];
  createParticleEffect(x, y, {
    count: 10 + (level * 5),
    colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
    size: sizes[Math.min(level - 1, sizes.length - 1)],
    speed: 2 + level,
    lifetime: 1200,
  });
};

export const createFireworkEffect = (x, y) => {
  // Multiple bursts for firework effect
  createParticleEffect(x, y, {
    count: 30,
    colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
    size: 4,
    speed: 6,
    lifetime: 1500,
  });

  setTimeout(() => {
    createParticleEffect(x, y - 50, {
      count: 20,
      colors: ['#fbbf24', '#fcd34d', '#fef3c7'],
      size: 6,
      speed: 4,
      lifetime: 1000,
    });
  }, 300);
};
