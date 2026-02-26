// Helper to get consistent gender colors
export const getGenderColor = (sex?: string): string => {
  if (sex === "Female") return "#ec4899"; // Pink
  if (sex === "Male") return "#3b82f6"; // Blue
  return "#6b7280"; // Gray for Other/Undefined
};

// Smart initials extractor (Joe Blogs -> JB)
const getInitials = (name: string): string => {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/); // Split by any amount of spaces
  
  if (parts.length === 1) {
    // If it's just one word (e.g. "Prince"), take first two letters
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  // Take the first letter of the first word, and first letter of the last word
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return (first + last).toUpperCase();
};

// Generates a base64 image of initials on a colored background
export const generateInitialsImage = (name: string, sex?: string): string => {
  const canvas = document.createElement("canvas");
  const size = 256; 
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const color = getGenderColor(sex);
  
  // Draw circular background
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Draw initials text
  ctx.fillStyle = "white";
  ctx.font = "bold 90px Arial"; // Slightly smaller font to fit two letters
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  const initials = getInitials(name);
  
  // Slight Y offset adjustment for visual centering of fonts
  ctx.fillText(initials, size / 2, (size / 2) + 8);

  return canvas.toDataURL("image/png");
};

// Wraps a user's photo in a colored circular border
export const generateProfileWithBorder = (imageUrl: string, sex?: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; 

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(imageUrl); 

      const color = getGenderColor(sex);
      const borderWidth = 16;
      const radius = size / 2;
      const innerRadius = radius - borderWidth;

      // 1. Draw the outer colored border background
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // 2. Create a clipping mask for the inner photo
      ctx.beginPath();
      ctx.arc(radius, radius, innerRadius, 0, Math.PI * 2);
      ctx.clip();

      // 3. Math to ensure the image covers the circle perfectly
      const scale = Math.max((innerRadius * 2) / img.width, (innerRadius * 2) / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const x = radius - (drawWidth / 2);
      const y = radius - (drawHeight / 2);
      
      ctx.drawImage(img, x, y, drawWidth, drawHeight);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => {
      console.warn("Failed to load profile image, falling back to raw url:", imageUrl);
      resolve(imageUrl); 
    };
    
    img.src = imageUrl;
  });
};