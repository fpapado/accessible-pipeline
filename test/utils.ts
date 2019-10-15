import * as path from 'path';

export function getFixturePath(filename: string, testName: string): string {
  return path.resolve(__dirname, 'fixtures', testName);
}
