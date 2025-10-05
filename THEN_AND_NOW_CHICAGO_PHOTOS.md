# Chicago Then & Now - Historical Photo Guide

This document provides historically accurate Then & Now photo suggestions for the Chi-Pins kiosk.

## Recommended Photo Pairs

### 1. **Willis Tower (Sears Tower)**
- **Then**: 1974 - Tower just completed, dominating skyline
- **Now**: Modern skyline view with surrounding towers
- **Location**: `{ lat: 41.8789, lng: -87.6359 }`
- **Historical Note**: World's tallest building 1973-1998
- **Photo Sources**:
  - Then: Chicago History Museum, Hedrich-Blessing Collection
  - Now: Current skyline from Millennium Park

### 2. **Navy Pier**
- **Then**: 1916 - Municipal Pier opening day
- **Now**: Modern Navy Pier with Ferris wheel
- **Location**: `{ lat: 41.8917, lng: -87.6050 }`
- **Historical Note**: Originally built as shipping/recreation facility
- **Photo Sources**:
  - Then: Chicago Public Library Special Collections
  - Now: Current aerial view

### 3. **Wrigley Field**
- **Then**: 1914 - Weeghman Park (original name)
- **Now**: Modern Wrigley with LED scoreboard
- **Location**: `{ lat: 41.9484, lng: -87.6553 }`
- **Historical Note**: Second-oldest MLB ballpark (1914)
- **Photo Sources**:
  - Then: Chicago Cubs Archives
  - Now: Recent game day photo

### 4. **The Loop / State Street**
- **Then**: 1907 - Marshall Field's and bustling streetcars
- **Now**: Modern State Street with Macy's
- **Location**: `{ lat: 41.8819, lng: -87.6278 }`
- **Historical Note**: "That Great Street" shopping district
- **Photo Sources**:
  - Then: Library of Congress
  - Now: Current State & Madison intersection

### 5. **Union Station**
- **Then**: 1925 - Grand opening of current building
- **Now**: Modern interior with preserved Great Hall
- **Location**: `{ lat: 41.8789, lng: -87.6397 }`
- **Historical Note**: Featured in "The Untouchables" (1987)
- **Photo Sources**:
  - Then: Chicago Architecture Center
  - Now: Current Great Hall photo

### 6. **Michigan Avenue Bridge**
- **Then**: 1920 - Bridge opening, connecting North/South
- **Now**: Modern Magnificent Mile view
- **Location**: `{ lat: 41.8886, lng: -87.6244 }`
- **Historical Note**: Enabled development of North Michigan Ave
- **Photo Sources**:
  - Then: Chicago History Museum
  - Now**: Current river view with Wrigley Building

### 7. **Buckingham Fountain**
- **Then**: 1927 - Dedication ceremony
- **Now**: Modern fountain with LED lights
- **Location**: `{ lat: 41.8758, lng: -87.6189 }`
- **Historical Note**: One of world's largest fountains (1927)
- **Photo Sources**:
  - Then: Grant Park Archives
  - Now: Evening light show photo

### 8. **Chicago Theatre**
- **Then**: 1921 - Grand opening night
- **Now**: Restored marquee and facade
- **Location**: `{ lat: 41.8851, lng: -87.6278 }`
- **Historical Note**: "Wonder Theatre of the World"
- **Photo Sources**:
  - Then: Chicago Landmarks Commission
  - Now: Night shot of iconic sign

### 9. **Millennium Park (Grant Park)**
- **Then**: 1900s - Illinois Central rail yards
- **Now**: Cloud Gate ("The Bean") and modern park
- **Location**: `{ lat: 41.8826, lng: -87.6226 }`
- **Historical Note**: Transformed from industrial to cultural hub
- **Photo Sources**:
  - Then: Chicago Public Library (rail yard photos)
  - Now: Cloud Gate reflection photo

### 10. **Water Tower**
- **Then**: 1871 - Survived Great Chicago Fire
- **Now**: Surrounded by modern high-rises
- **Location**: `{ lat: 41.8978, lng: -87.6239 }`
- **Historical Note**: One of few structures to survive 1871 fire
- **Photo Sources**:
  - Then: Post-fire photo (1871)
  - Now: Current Magnificent Mile context

### 11. **Old Chicago Stock Exchange**
- **Then**: 1894 - Adler & Sullivan building
- **Now**: Site now occupied by other buildings (arch preserved at Art Institute)
- **Location**: `{ lat: 41.8785, lng: -87.6298 }`
- **Historical Note**: Demolished 1972 despite preservation efforts
- **Photo Sources**:
  - Then: Interior trading room
  - Now: Current site / preserved arch

### 12. **Riverwalk**
- **Then**: 1920s - Industrial riverfront
- **Now**: Modern recreational Riverwalk
- **Location**: `{ lat: 41.8875, lng: -87.6244 }`
- **Historical Note**: Transformed from industrial to pedestrian
- **Photo Sources**:
  - Then: Industrial boats and warehouses
  - Now: Modern cafe-lined walkway

## Where to Find Historical Photos

### Free Public Domain Sources:
1. **Chicago Public Library Digital Collections**
   - https://www.chipublib.org/archival_subject/chicago-history/
   - Thousands of historical Chicago photos

2. **Library of Congress**
   - Detroit Publishing Company Collection
   - Farm Security Administration photos

3. **Wikimedia Commons**
   - Category: Historical images of Chicago
   - Many public domain photos

4. **Chicago History Museum**
   - Some images available for educational use
   - Hedrich-Blessing Collection (architecture)

5. **Newberry Library**
   - Historical maps and photos
   - Digital collections

### Modern "Now" Photos:
1. **Unsplash** - Free high-quality photos
2. **Pexels** - Free stock photos
3. **Wikimedia Commons** - User-contributed
4. **Your own photos** - Take them yourself!

## Implementation Example

```javascript
const thenAndNowPairs = [
  {
    id: 1,
    title: "Willis Tower",
    location: { lat: 41.8789, lng: -87.6359 },
    thenYear: 1974,
    nowYear: 2024,
    thenImage: "/images/then-now/willis-1974.jpg",
    nowImage: "/images/then-now/willis-2024.jpg",
    description: "Completed in 1973 as Sears Tower, it was the world's tallest building until 1998.",
    historicalNote: "The tower has 104 elevators and 16,100 windows."
  },
  // ... more pairs
];
```

## Photo Specifications

- **Format**: JPG or WebP
- **Size**: 1920x1080 (16:9) recommended
- **Aspect Ratio**: Match between then/now for smooth transitions
- **Quality**: High resolution for zoom
- **File Size**: Optimize to < 500KB each

## Copyright Considerations

- **Public Domain**: Photos published before 1928
- **Fair Use**: Educational/historical purposes
- **Creative Commons**: Check license (CC0, CC-BY)
- **Own Photos**: Take your own "Now" photos!

## Next Steps

1. **Choose 10-15 iconic locations** from list above
2. **Source historical photos** from public domain collections
3. **Take or source modern photos** matching same angle
4. **Upload to Supabase storage** in `then-now-images` bucket
5. **Update database** with image URLs and metadata

Would you like me to help implement the database integration for these historical photos?
