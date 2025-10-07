// src/components/ContentLayoutTab.jsx
import { useState, useEffect } from 'react';
import { useAdminSettings } from '../state/useAdminSettings';
import { useNavigationSettings } from '../hooks/useNavigationSettings';

/**
 * Content Layout Tab
 *
 * Manages the layout and ordering of:
 * - Scroll Bars (banners at top: Now Playing, News Ticker)
 * - Overlay Widgets (on-screen widgets: Weather, etc.)
 * - Navigation Items (footer menu: Games, Jukebox, Order)
 */

export default function ContentLayoutTab() {
  const { settings: adminSettings, save: saveAdminSettings } = useAdminSettings();
  const { settings: navSettings, updateSettings: updateNavSettings } = useNavigationSettings();

  // Scroll Bars State
  const [scrollBars, setScrollBars] = useState([
    {
      id: 'now-playing',
      name: 'Now Playing',
      enabled: adminSettings.showNowPlayingOnMobile !== false,
      order: 0,
      location: 'top',
      settings: {
        scrollSpeedKiosk: adminSettings.nowPlayingScrollSpeedKiosk || 30,
        scrollSpeedMobile: adminSettings.nowPlayingScrollSpeedMobile || 20,
      }
    },
    {
      id: 'news-ticker',
      name: 'News Ticker',
      enabled: adminSettings.newsTickerEnabled || false,
      order: 1,
      location: 'top',
      settings: {
        scrollSpeedKiosk: adminSettings.newsTickerScrollSpeedKiosk || 30,
        scrollSpeedMobile: adminSettings.newsTickerScrollSpeedMobile || 20,
        rssUrl: adminSettings.newsTickerRssUrl || '',
      }
    },
  ]);

  // Overlay Widgets State
  const [overlayWidgets, setOverlayWidgets] = useState([
    {
      id: 'weather',
      name: 'Weather Widget',
      enabled: adminSettings.showWeatherWidget !== false,
      position: 'top-right',
      order: 0,
      settings: {
        location: adminSettings.weatherLocation || 'Chicago, IL',
        lat: adminSettings.weatherLat || 41.8781,
        lng: adminSettings.weatherLng || -87.6298,
      }
    },
  ]);

  // Navigation Items State (from useNavigationSettings)
  const [navItems, setNavItems] = useState([]);

  // Sync with navSettings when it loads
  useEffect(() => {
    if (navSettings) {
      const items = [
        {
          id: 'games',
          name: 'Games',
          enabled: navSettings.games?.enabled ?? true,
          order: navSettings.games?.order ?? 0,
          icon: '🎮',
          settings: {
            idleTimeout: adminSettings.gamesIdleTimeout || 180,
          }
        },
        {
          id: 'jukebox',
          name: 'Jukebox',
          enabled: navSettings.jukebox?.enabled ?? true,
          order: navSettings.jukebox?.order ?? 1,
          icon: '🎵',
          settings: {
            idleTimeout: adminSettings.jukeboxIdleTimeout || 120,
            audioOutputType: adminSettings.audioOutputType || 'local',
          }
        },
        {
          id: 'order',
          name: 'Order',
          enabled: navSettings.order?.enabled ?? true,
          order: navSettings.order?.order ?? 2,
          icon: '🍕',
          settings: {
            idleTimeout: adminSettings.orderingIdleTimeout || 300,
          }
        },
      ].sort((a, b) => a.order - b.order);

      setNavItems(items);
    }
  }, [navSettings, adminSettings]);

  // Save all changes
  const handleSave = async () => {
    try {
      // Save scroll bars settings
      const scrollBarsSettings = {};
      scrollBars.forEach(bar => {
        if (bar.id === 'now-playing') {
          scrollBarsSettings.showNowPlayingOnMobile = bar.enabled;
          scrollBarsSettings.nowPlayingScrollSpeedKiosk = bar.settings.scrollSpeedKiosk;
          scrollBarsSettings.nowPlayingScrollSpeedMobile = bar.settings.scrollSpeedMobile;
        } else if (bar.id === 'news-ticker') {
          scrollBarsSettings.newsTickerEnabled = bar.enabled;
          scrollBarsSettings.newsTickerScrollSpeedKiosk = bar.settings.scrollSpeedKiosk;
          scrollBarsSettings.newsTickerScrollSpeedMobile = bar.settings.scrollSpeedMobile;
          scrollBarsSettings.newsTickerRssUrl = bar.settings.rssUrl;
        }
      });

      // Save overlay widgets settings
      const overlaySettings = {};
      overlayWidgets.forEach(widget => {
        if (widget.id === 'weather') {
          overlaySettings.showWeatherWidget = widget.enabled;
          overlaySettings.weatherLocation = widget.settings.location;
          overlaySettings.weatherLat = widget.settings.lat;
          overlaySettings.weatherLng = widget.settings.lng;
        }
      });

      // Save navigation settings
      const navItemsSettings = {};
      navItems.forEach(item => {
        navItemsSettings[item.id] = {
          enabled: item.enabled,
          order: item.order,
        };

        // Save idle timeouts
        if (item.id === 'games') {
          overlaySettings.gamesIdleTimeout = item.settings.idleTimeout;
        } else if (item.id === 'jukebox') {
          overlaySettings.jukeboxIdleTimeout = item.settings.idleTimeout;
          overlaySettings.audioOutputType = item.settings.audioOutputType;
        } else if (item.id === 'order') {
          overlaySettings.orderingIdleTimeout = item.settings.idleTimeout;
        }
      });

      // Save admin settings
      await saveAdminSettings({ ...scrollBarsSettings, ...overlaySettings });

      // Save navigation settings
      await updateNavSettings(navItemsSettings);

      alert('✅ Layout saved successfully!');
    } catch (error) {
      console.error('Error saving layout:', error);
      alert('❌ Error saving layout: ' + error.message);
    }
  };

  // Move item up in order
  const moveUp = (items, setItems, index) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    // Update order values
    newItems.forEach((item, i) => {
      item.order = i;
    });
    setItems(newItems);
  };

  // Move item down in order
  const moveDown = (items, setItems, index) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    // Update order values
    newItems.forEach((item, i) => {
      item.order = i;
    });
    setItems(newItems);
  };

  // Toggle enabled
  const toggleEnabled = (items, setItems, index) => {
    const newItems = [...items];
    newItems[index].enabled = !newItems[index].enabled;
    setItems(newItems);
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>Content Layout Manager</h2>
        <p style={s.subtitle}>Manage scroll bars, widgets, and navigation items</p>
      </div>

      {/* Scroll Bars Section */}
      <section style={s.section}>
        <h3 style={s.sectionTitle}>📰 Scroll Bars (Top Banners)</h3>
        <p style={s.sectionDesc}>Scrolling banners that appear at the top of the screen</p>

        <div style={s.itemsList}>
          {scrollBars.map((bar, index) => (
            <div key={bar.id} style={s.item}>
              <div style={s.itemHeader}>
                <div style={s.itemLeft}>
                  <input
                    type="checkbox"
                    checked={bar.enabled}
                    onChange={() => toggleEnabled(scrollBars, setScrollBars, index)}
                    style={s.checkbox}
                  />
                  <span style={bar.enabled ? s.itemName : s.itemNameDisabled}>
                    {bar.name}
                  </span>
                  <span style={s.badge}>{bar.location}</span>
                </div>
                <div style={s.itemControls}>
                  <button
                    onClick={() => moveUp(scrollBars, setScrollBars, index)}
                    disabled={index === 0}
                    style={index === 0 ? s.btnDisabled : s.btnSmall}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(scrollBars, setScrollBars, index)}
                    disabled={index === scrollBars.length - 1}
                    style={index === scrollBars.length - 1 ? s.btnDisabled : s.btnSmall}
                  >
                    ↓
                  </button>
                  <span style={s.order}>#{bar.order + 1}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Overlay Widgets Section */}
      <section style={s.section}>
        <h3 style={s.sectionTitle}>🔲 Overlay Widgets</h3>
        <p style={s.sectionDesc}>Widgets that appear on top of the main content</p>

        <div style={s.itemsList}>
          {overlayWidgets.map((widget, index) => (
            <div key={widget.id} style={s.item}>
              <div style={s.itemHeader}>
                <div style={s.itemLeft}>
                  <input
                    type="checkbox"
                    checked={widget.enabled}
                    onChange={() => toggleEnabled(overlayWidgets, setOverlayWidgets, index)}
                    style={s.checkbox}
                  />
                  <span style={widget.enabled ? s.itemName : s.itemNameDisabled}>
                    {widget.name}
                  </span>
                  <span style={s.badge}>{widget.position}</span>
                </div>
                <div style={s.itemControls}>
                  <button
                    onClick={() => moveUp(overlayWidgets, setOverlayWidgets, index)}
                    disabled={index === 0}
                    style={index === 0 ? s.btnDisabled : s.btnSmall}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(overlayWidgets, setOverlayWidgets, index)}
                    disabled={index === overlayWidgets.length - 1}
                    style={index === overlayWidgets.length - 1 ? s.btnDisabled : s.btnSmall}
                  >
                    ↓
                  </button>
                  <span style={s.order}>#{widget.order + 1}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Navigation Items Section */}
      <section style={s.section}>
        <h3 style={s.sectionTitle}>🧭 Navigation Items (Footer Menu)</h3>
        <p style={s.sectionDesc}>Menu items that appear in the footer navigation bar</p>

        <div style={s.itemsList}>
          {navItems.map((item, index) => (
            <div key={item.id} style={s.item}>
              <div style={s.itemHeader}>
                <div style={s.itemLeft}>
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={() => toggleEnabled(navItems, setNavItems, index)}
                    style={s.checkbox}
                  />
                  <span style={s.icon}>{item.icon}</span>
                  <span style={item.enabled ? s.itemName : s.itemNameDisabled}>
                    {item.name}
                  </span>
                </div>
                <div style={s.itemControls}>
                  <button
                    onClick={() => moveUp(navItems, setNavItems, index)}
                    disabled={index === 0}
                    style={index === 0 ? s.btnDisabled : s.btnSmall}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(navItems, setNavItems, index)}
                    disabled={index === navItems.length - 1}
                    style={index === navItems.length - 1 ? s.btnDisabled : s.btnSmall}
                  >
                    ↓
                  </button>
                  <span style={s.order}>#{item.order + 1}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save Button */}
      <div style={s.footer}>
        <button onClick={handleSave} style={s.btnPrimary}>
          💾 Save Layout Changes
        </button>
      </div>
    </div>
  );
}

// Styles
const s = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '30px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  section: {
    marginBottom: '40px',
    background: '#f9fafb',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    color: '#374151',
  },
  sectionDesc: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 20px 0',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  item: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  icon: {
    fontSize: '24px',
  },
  itemName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  itemNameDisabled: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#9ca3af',
    textDecoration: 'line-through',
  },
  badge: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    background: '#e5e7eb',
    color: '#4b5563',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  itemControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  btnSmall: {
    padding: '6px 12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    minWidth: '36px',
  },
  btnDisabled: {
    padding: '6px 12px',
    background: '#e5e7eb',
    color: '#9ca3af',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'not-allowed',
    minWidth: '36px',
  },
  order: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#667eea',
    minWidth: '32px',
    textAlign: 'center',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '20px',
    borderTop: '2px solid #e5e7eb',
  },
  btnPrimary: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  },
};
