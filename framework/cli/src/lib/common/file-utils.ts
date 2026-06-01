import fs from "fs-extra";
import path from "path";

/**
 * File system utilities for safe file operations
 *
 * Provides async helpers with proper encoding and error handling.
 * Based on Python's pathlib-based file_utils.py from the core framework.
 */

/**
 * Safely read file contents
 *
 * @param filePath - Path to file
 * @param encoding - File encoding (default: utf-8)
 * @returns File contents as string
 * @throws {Error} If file doesn't exist or read fails
 *
 * @example
 * ```typescript
 * const content = await safeRead('/path/to/file.txt');
 * ```
 */
export async function safeRead(
  filePath: string,
  encoding: BufferEncoding = "utf-8",
): Promise<string> {
  try {
    return await fs.readFile(filePath, encoding);
  } catch (error) {
    if (error instanceof Error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`File not found: ${filePath}`, { cause: error });
      }
      throw new Error(`Error reading ${filePath}: ${error.message}`, {
        cause: error,
      });
    }
    throw error;
  }
}

/**
 * Safely write content to file
 *
 * Creates parent directories if they don't exist.
 *
 * @param filePath - Path to file
 * @param content - Content to write
 * @param encoding - File encoding (default: utf-8)
 * @throws {Error} If write fails
 *
 * @example
 * ```typescript
 * await safeWrite('/path/to/file.txt', 'Hello, World!');
 * ```
 */
export async function safeWrite(
  filePath: string,
  content: string,
  encoding: BufferEncoding = "utf-8",
): Promise<void> {
  try {
    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, encoding);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error writing ${filePath}: ${error.message}`, {
        cause: error,
      });
    }
    throw error;
  }
}

/**
 * Ensure directory exists, create if needed
 *
 * Creates parent directories recursively if they don't exist.
 *
 * @param dirPath - Path to directory
 *
 * @example
 * ```typescript
 * await ensureDirectory('/path/to/nested/directory');
 * ```
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * Check if a path exists (file or directory)
 *
 * @param path - Path to check
 * @returns True if path exists, false otherwise
 *
 * @example
 * ```typescript
 * if (await fileExists('/path/to/file.txt')) {
 *   console.log('File exists!');
 * }
 * ```
 */
export async function fileExists(path: string): Promise<boolean> {
  return await fs.pathExists(path);
}

/**
 * Check if a path is a directory
 *
 * @param path - Path to check
 * @returns True if path exists and is a directory, false otherwise
 *
 * @example
 * ```typescript
 * if (await isDirectory('/path/to/dir')) {
 *   console.log('It is a directory!');
 * }
 * ```
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a path is a file
 *
 * @param path - Path to check
 * @returns True if path exists and is a file, false otherwise
 *
 * @example
 * ```typescript
 * if (await isFile('/path/to/file.txt')) {
 *   console.log('It is a file!');
 * }
 * ```
 */
export async function isFile(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}
