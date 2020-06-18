import cssJson from "vscode-web-custom-data/data/browsers.css-data.json";

export function completePropertyName(query: string): string[] {
  const results: string[] = [];
  cssJson.properties.forEach(({ name }) => {
    if (name.startsWith(query)) {
      results.push(name);
    }
  });
  return results;
}

export function isValidProperty(propertyName: string): boolean {
  return cssJson.properties.some(({ name }) => name === propertyName);
}

export function getValidPropertyValues(
  propertyName: string
): string[] | undefined {
  const property = cssJson.properties.find(({ name }) => name === propertyName);
  if (property === undefined || property.values === undefined) {
    return undefined;
  }
  return (property.values as any).map((value: any) => value.name);
}
