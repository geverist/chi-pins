# Kiosk Clusters - Multi-Location Management

This feature allows restaurants and businesses with multiple locations to group their kiosks together, enabling:
- Shared branding and settings across locations
- Customer location switching
- Distance-based location suggestions
- Per-location customization

## 📋 Database Schema

The system uses three main tables:

### `kiosk_clusters`
Main business/restaurant information
- `id` - UUID primary key
- `name` - Business name (e.g., "Chicago Mike's Pizzeria")
- `owner_name`, `owner_email`, `owner_phone` - Contact info
- `description` - Business description
- `logo_url` - Shared logo across locations
- `primary_color` - Brand color for UI elements
- `active` - Enable/disable cluster

### `kiosk_locations`
Individual physical locations
- `id` - UUID primary key
- `cluster_id` - References kiosk_clusters
- `location_name` - Location identifier (e.g., "River North Location")
- `address`, `city`, `state`, `zip` - Full address
- `lat`, `lng` - Coordinates for distance calculations
- `phone` - Location-specific phone
- `hours_json` - Operating hours (JSONB)
- `is_primary` - Mark one location as primary
- `display_order` - Order in lists
- `active` - Enable/disable location

### `kiosk_location_settings`
Location-specific configuration
- `location_id` - References kiosk_locations
- `welcome_message` - Custom greeting
- `custom_logo_url` - Override cluster logo
- `show_other_locations` - Enable/disable location switcher
- `show_distance` - Show distance to other locations
- Feature toggles (games, jukebox, ordering, etc.)
- Menu/ordering URLs
- Contact form settings

## 🚀 Setup Instructions

### 1. Run the Migration

Execute the SQL migration in your Supabase dashboard:

```bash
# File: create-kiosk-clusters-table.sql
```

This creates:
- All three tables with proper relationships
- Row Level Security (RLS) policies for public read access
- Sample data for testing (Chicago Mike's Pizzeria, Windy City Hotdogs)
- Triggers for `updated_at` timestamps

### 2. Create a Cluster

Via Supabase dashboard:

```sql
INSERT INTO kiosk_clusters (name, owner_name, owner_email, description, primary_color)
VALUES (
  'Your Restaurant Name',
  'Owner Name',
  'owner@email.com',
  'Description of your business',
  '#ef4444'  -- Brand color
);
```

### 3. Add Locations

Get your cluster ID and add locations:

```sql
-- Get cluster ID
SELECT id FROM kiosk_clusters WHERE name = 'Your Restaurant Name';

-- Add locations
INSERT INTO kiosk_locations (
  cluster_id,
  location_name,
  address,
  lat,
  lng,
  phone,
  is_primary,
  display_order
) VALUES
  (
    'YOUR-CLUSTER-ID',
    'Downtown Location',
    '123 Main St, Chicago, IL 60601',
    41.8781,
    -87.6298,
    '(312) 555-0100',
    true,
    1
  ),
  (
    'YOUR-CLUSTER-ID',
    'Lincoln Park Location',
    '456 Park Ave, Chicago, IL 60614',
    41.9250,
    -87.6500,
    '(312) 555-0101',
    false,
    2
  );
```

### 4. Configure Location Settings

```sql
INSERT INTO kiosk_location_settings (
  location_id,
  welcome_message,
  show_other_locations,
  show_distance,
  games_enabled,
  menu_url
)
SELECT
  id,
  'Welcome to ' || location_name || '!',
  true,
  true,
  true,
  'https://yourrestaurant.com/menu'
FROM kiosk_locations
WHERE cluster_id = 'YOUR-CLUSTER-ID';
```

## 🎯 Using in the Kiosk

### Activate Cluster Mode

Add the `location` parameter to your kiosk URL:

```
https://your-kiosk-url.com/?location=LOCATION-UUID
```

Example:
```
https://chi-pins.vercel.app/?location=12345678-1234-1234-1234-123456789abc
```

### What Happens

When a location ID is provided:
1. The kiosk loads cluster data automatically
2. Location switcher button appears (bottom left)
3. Customers can view and switch to other locations
4. Distances are calculated from current location
5. Location-specific settings are applied

### URL Persistence

The location ID is saved to localStorage, so:
- Reloading the page maintains the selected location
- No need to keep `?location=` in URL after first load
- Can be overridden by providing a different location ID

## 📱 User Interface

### Location Switcher Component

Add to your App.jsx:

```jsx
import LocationSwitcher from './components/LocationSwitcher';

function App() {
  return (
    <>
      {/* Your app content */}
      <LocationSwitcher />
    </>
  );
}
```

Features:
- Floating button showing number of other locations
- Modal with current location highlighted
- Sorted list by distance (if coordinates provided)
- Click to switch locations instantly
- Branded with cluster's primary color

### Admin Panel

View all clusters in Admin Panel → Kiosk Clusters tab:
- See all clusters and their locations
- View location IDs for URL parameters
- Check active/inactive status
- See contact information
- Quick instructions for setup

## 🔧 React Hook API

### `useKioskCluster()`

```jsx
const {
  cluster,              // Cluster data object
  currentLocation,      // Current location object
  otherLocations,       // Array of other locations
  settings,             // Location-specific settings
  loading,              // Loading state
  error,                // Error message if any
  isClusterMode,        // true if cluster active with locations
  getLocationsByDistance, // Function to get sorted locations
  switchLocation,       // Function to switch locations
  reload                // Reload cluster data
} = useKioskCluster();
```

### Example Usage

```jsx
import { useKioskCluster } from '../hooks/useKioskCluster';

function MyComponent() {
  const { cluster, currentLocation, isClusterMode } = useKioskCluster();

  if (!isClusterMode) {
    return <div>Single location mode</div>;
  }

  return (
    <div>
      <h1>{cluster.name}</h1>
      <h2>Current: {currentLocation.location_name}</h2>
      <p>{currentLocation.address}</p>
    </div>
  );
}
```

## 🎨 Customization

### Per-Location Branding

Each location can override the cluster logo:

```sql
UPDATE kiosk_location_settings
SET custom_logo_url = 'https://example.com/custom-logo.png'
WHERE location_id = 'LOCATION-ID';
```

### Feature Toggles

Enable/disable features per location:

```sql
UPDATE kiosk_location_settings
SET
  games_enabled = false,
  jukebox_enabled = true,
  order_enabled = true
WHERE location_id = 'LOCATION-ID';
```

### Distance Display

Hide distance calculations:

```sql
UPDATE kiosk_location_settings
SET show_distance = false
WHERE location_id = 'LOCATION-ID';
```

### Disable Location Switcher

Hide the switcher button completely:

```sql
UPDATE kiosk_location_settings
SET show_other_locations = false
WHERE location_id = 'LOCATION-ID';
```

## 📊 Example Scenarios

### Scenario 1: Pizza Chain with 3 Locations

```sql
-- Create cluster
INSERT INTO kiosk_clusters (name, owner_email, primary_color)
VALUES ('Best Pizza', 'owner@bestpizza.com', '#dc2626')
RETURNING id;

-- Add 3 locations with coordinates
INSERT INTO kiosk_locations (cluster_id, location_name, address, lat, lng, is_primary, display_order)
VALUES
  ('cluster-id', 'Downtown', '123 Main St', 41.8781, -87.6298, true, 1),
  ('cluster-id', 'North Side', '456 Clark St', 41.9250, -87.6500, false, 2),
  ('cluster-id', 'South Loop', '789 State St', 41.8756, -87.6264, false, 3);
```

Result: Customers at Downtown can see North Side is 3.2 mi away and South Loop is 0.8 mi away.

### Scenario 2: Single Restaurant, Multiple Kiosks

Same location, different kiosks (bar vs. dining room):

```sql
INSERT INTO kiosk_locations (cluster_id, location_name, address, lat, lng, is_primary)
VALUES
  ('cluster-id', 'Bar Kiosk', '100 Main St', 41.8781, -87.6298, true),
  ('cluster-id', 'Dining Kiosk', '100 Main St', 41.8781, -87.6298, false);

-- Different settings per kiosk
UPDATE kiosk_location_settings
SET jukebox_enabled = true, games_enabled = false
WHERE location_id = (SELECT id FROM kiosk_locations WHERE location_name = 'Bar Kiosk');

UPDATE kiosk_location_settings
SET jukebox_enabled = false, games_enabled = true
WHERE location_id = (SELECT id FROM kiosk_locations WHERE location_name = 'Dining Kiosk');
```

## 🔍 Troubleshooting

### Location Switcher Not Showing

1. Verify `?location=` parameter in URL
2. Check cluster has multiple active locations:
   ```sql
   SELECT * FROM kiosk_locations WHERE cluster_id = 'YOUR-CLUSTER-ID' AND active = true;
   ```
3. Ensure `show_other_locations = true` in settings

### Distance Not Calculating

1. Verify lat/lng coordinates are set:
   ```sql
   SELECT location_name, lat, lng FROM kiosk_locations WHERE cluster_id = 'YOUR-CLUSTER-ID';
   ```
2. Check coordinates are decimal degrees (not DMS format)

### Location Not Loading

1. Check RLS policies are enabled
2. Verify location is active
3. Check browser console for errors
4. Ensure Supabase connection is working

## 📝 Best Practices

1. **Always set coordinates** for distance calculations
2. **Mark one location as primary** for default behavior
3. **Use display_order** to control list sorting
4. **Test location switching** before deploying to production
5. **Keep cluster branding consistent** across locations
6. **Provide clear location names** (e.g., "River North Location" not just "Location 1")
7. **Include phone numbers** for each location
8. **Set realistic operating hours** in hours_json

## 🚦 Real-time Updates

The system uses Supabase real-time subscriptions:
- Location data changes reflect immediately
- Settings updates apply instantly
- No page reload required
- Automatic reconnection on network issues

## 📈 Future Enhancements

Potential additions:
- [ ] Online ordering integration per location
- [ ] Reservation system
- [ ] Loyalty program across locations
- [ ] Analytics dashboard
- [ ] A/B testing per location
- [ ] Seasonal menu switching
- [ ] Peak hours indicators
- [ ] Wait time estimates
