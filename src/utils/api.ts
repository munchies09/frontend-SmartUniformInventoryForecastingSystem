/**
 * Helper function to build API URLs without double slashes
 */
export function buildApiUrl(...parts: (string | undefined | null)[]): string {
  const baseUrl = "http://localhost:5000";
  const filteredParts = parts.filter((part): part is string => 
    part !== undefined && part !== null && part !== ""
  );
  
  const path = filteredParts
    .map(part => part.replace(/^\/+|\/+$/g, '')) // Remove leading/trailing slashes
    .join('/');
  
  return `${baseUrl}/${path}`.replace(/\/+/g, '/'); // Remove any double slashes
}


