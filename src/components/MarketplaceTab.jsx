// src/components/MarketplaceTab.jsx
// Marketplace for installing/uninstalling features to the kiosk
import { useState, useMemo } from 'react';
import { MARKETPLACE_FEATURES, getFeaturesByIndustry, getIndustries } from '../data/marketplaceFeatures';

export default function MarketplaceTab({ settings, onSave }) {
  const [selectedIndustry, setSelectedIndustry] = useState('All Industries');
  const [expandedFeature, setExpandedFeature] = useState(null);

  const installedFeatures = settings.installedFeatures || [];

  // Get unique industries
  const industries = useMemo(() => getIndustries(), []);

  // Filter features by industry
  const filteredFeatures = useMemo(() => {
    return getFeaturesByIndustry(selectedIndustry);
  }, [selectedIndustry]);

  // Count active navigation items (features that require nav slot and are installed + enabled)
  const activeNavItems = useMemo(() => {
    return installedFeatures.filter(featureId => {
      const feature = MARKETPLACE_FEATURES.find(f => f.id === featureId);
      if (!feature?.requiresNavSlot) return false;

      // Check if feature is enabled in navigation settings
      // For now, we'll just count installed features that require nav slots
      // The actual enable/disable happens in Features tab
      return true;
    }).length;
  }, [installedFeatures]);

  const handleInstall = (featureId) => {
    const feature = MARKETPLACE_FEATURES.find(f => f.id === featureId);

    // Check if installing would exceed navigation limit
    if (feature.requiresNavSlot) {
      const maxNavItems = settings.maxNavigationItems || 5;
      const willExceedLimit = activeNavItems >= maxNavItems;

      if (willExceedLimit) {
        alert(`Cannot install ${feature.name}: You've reached the maximum of ${maxNavItems} navigation items. You can still install the feature but won't be able to enable it until you disable another navigation item.`);
        // Still allow installation, just warn them
      }
    }

    const updated = [...installedFeatures, featureId];
    onSave({ installedFeatures: updated });
  };

  const handleUninstall = (featureId) => {
    const feature = MARKETPLACE_FEATURES.find(f => f.id === featureId);

    if (!confirm(`Remove ${feature.name} from your kiosk? This will disable the feature and remove it from the Features tab.`)) {
      return;
    }

    const updated = installedFeatures.filter(id => id !== featureId);
    onSave({ installedFeatures: updated });
  };

  const toggleExpanded = (featureId) => {
    setExpandedFeature(expandedFeature === featureId ? null : featureId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Feature Marketplace</h3>
        <p className="text-sm text-gray-600">
          Install features to add functionality to your kiosk. Features must be installed before they appear in the Features tab.
        </p>
        <div className="mt-2 flex items-center gap-4 text-sm">
          <div className="text-gray-700">
            <span className="font-medium">{installedFeatures.length}</span> features installed
          </div>
          <div className="text-gray-700">
            <span className="font-medium">{activeNavItems}</span> / <span className="font-medium">{settings.maxNavigationItems || 5}</span> navigation slots used
          </div>
        </div>
      </div>

      {/* Industry Filter */}
      <div className="flex flex-wrap gap-2">
        {industries.map(ind => (
          <button
            key={ind}
            onClick={() => setSelectedIndustry(ind)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedIndustry === ind
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {ind}
          </button>
        ))}
      </div>

      {/* Feature Grid - Enhanced Tile-Based Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFeatures.map(feature => {
          const isInstalled = installedFeatures.includes(feature.id);
          const isExpanded = expandedFeature === feature.id;

          return (
            <div
              key={feature.id}
              className={`border-2 rounded-2xl p-6 transition-all duration-200 transform hover:scale-105 shadow-lg ${
                isInstalled
                  ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-green-200'
                  : 'border-gray-300 bg-gradient-to-br from-white to-gray-50 hover:border-blue-500 hover:shadow-blue-200'
              }`}
            >
              {/* Feature Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{feature.icon}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{feature.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {feature.category}
                      </span>
                      {feature.requiresNavSlot && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          Nav Item
                        </span>
                      )}
                      {isInstalled && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                          ✓ Installed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Description */}
              <p className="text-sm text-gray-600 mb-3">{feature.description}</p>

              {/* Expand/Collapse Button */}
              <button
                onClick={() => toggleExpanded(feature.id)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-3"
              >
                {isExpanded ? '▼ Show Less' : '▶ Learn More'}
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mb-3 space-y-3 text-sm">
                  <div>
                    <p className="text-gray-700">{feature.longDescription}</p>
                  </div>

                  {feature.benefits && feature.benefits.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Benefits:</p>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {feature.benefits.map((benefit, idx) => (
                          <li key={idx}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feature.configurableOptions && feature.configurableOptions.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Configurable Options:</p>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {feature.configurableOptions.slice(0, 3).map((opt, idx) => (
                          <li key={idx}>{opt.label}</li>
                        ))}
                        {feature.configurableOptions.length > 3 && (
                          <li className="italic">+ {feature.configurableOptions.length - 3} more options</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {feature.estimatedFooterHeight > 0 && (
                    <div className="text-xs text-gray-500">
                      Note: Adds {feature.estimatedFooterHeight}px to layout height
                    </div>
                  )}
                </div>
              )}

              {/* Install/Uninstall Button */}
              <div className="flex gap-2">
                {isInstalled ? (
                  <button
                    onClick={() => handleUninstall(feature.id)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(feature.id)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    + Add to Kiosk
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredFeatures.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No features found in this category.
        </div>
      )}
    </div>
  );
}
