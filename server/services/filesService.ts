import type { FilesResponse, FileContentResponse } from "../../shared/files";
import { listDirectoryContents, searchFiles } from "../utils/fileSearch";
import {
  inferHighlightLanguage,
  normalizeRelativeFilePath,
  readProjectFile,
} from "../utils/fileContent";
import { projectBaseName } from "../utils/paths";
import { parentDirectoryOf } from "../utils/directoryUtils";

/**
 * Gets files based on query (search) or directory listing
 */
export const getFiles = async (
  query: string,
  directory: string,
): Promise<FilesResponse> => {
  const items = query
    ? await searchFiles(query, 10)
    : await listDirectoryContents(directory);

  return {
    query,
    directory,
    parentDirectory: parentDirectoryOf(directory),
    items,
    projectName: projectBaseName(),
  };
};

/**
 * Gets file content by normalized path
 */
export const getFileContent = async (
  pathParam: string,
): Promise<FileContentResponse> => {
  const normalizedPath = normalizeRelativeFilePath(pathParam);
  const result = await readProjectFile(normalizedPath);

  return {
    path: result.path,
    size: result.size,
    isBinary: result.isBinary,
    content: result.content,
    truncated: result.truncated,
    language: inferHighlightLanguage(result.path),
  };
};
