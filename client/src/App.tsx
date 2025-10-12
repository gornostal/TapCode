import { useCallback, useEffect, useRef, useState } from "react";

import type {
  FileContentResponse,
  FileListItem,
  FilesResponse,
} from "@shared/messages";

import FileBrowser from "@/components/FileBrowser";
import FilePreview from "@/components/FilePreview";
import GoToFileSearch from "@/components/GoToFileSearch";
import Toolbar from "@/components/Toolbar";

type RouteState =
  | {
      page: "list";
    }
  | {
      page: "file";
      path: string;
    };

const parseRoute = (): RouteState => {
  const { pathname, search } = window.location;

  if (pathname.startsWith("/file")) {
    const params = new URLSearchParams(search);
    const pathParam = params.get("path");

    if (pathParam && pathParam.trim()) {
      return { page: "file", path: pathParam };
    }
  }

  return { page: "list" };
};

function App() {
  const [route, setRoute] = useState<RouteState>(() => parseRoute());
  const [files, setFiles] = useState<FileListItem[]>([]);
  const [currentDirectory, setCurrentDirectory] = useState("");
  const [parentDirectory, setParentDirectory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");

  const [selectedFile, setSelectedFile] = useState<FileContentResponse | null>(
    null,
  );
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRequestRef = useRef<AbortController | null>(null);
  const [isGoToFileOpen, setIsGoToFileOpen] = useState(false);

  const resetFileViewer = useCallback(() => {
    if (fileRequestRef.current) {
      fileRequestRef.current.abort();
      fileRequestRef.current = null;
    }

    setSelectedFile(null);
    setActiveFilePath(null);
    setFileError(null);
    setIsFileLoading(false);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseRoute());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadFiles = async () => {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (currentDirectory) {
        params.set("dir", currentDirectory);
      }

      try {
        const response = await fetch(
          params.size ? `/api/files?${params.toString()}` : "/api/files",
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as FilesResponse;

        if (!controller.signal.aborted) {
          setFiles(data.items);
          setParentDirectory(data.parentDirectory);
          setProjectName(data.projectName);
          setError(null);

          if (data.directory !== currentDirectory) {
            setCurrentDirectory(data.directory);
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadFiles();

    return () => {
      controller.abort();
    };
  }, [currentDirectory]);

  useEffect(
    () => () => {
      if (fileRequestRef.current) {
        fileRequestRef.current.abort();
      }
    },
    [],
  );

  const loadFile = useCallback(async (path: string) => {
    if (fileRequestRef.current) {
      fileRequestRef.current.abort();
    }

    const controller = new AbortController();
    fileRequestRef.current = controller;

    setIsFileLoading(true);
    setFileError(null);
    setSelectedFile(null);
    setActiveFilePath(path);

    const params = new URLSearchParams();
    params.set("path", path);

    try {
      const response = await fetch(`/api/file?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as FileContentResponse;

      if (!controller.signal.aborted) {
        setSelectedFile(data);
        setActiveFilePath(data.path);
        setFileError(null);
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      setFileError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (fileRequestRef.current === controller) {
        fileRequestRef.current = null;
      }

      if (!controller.signal.aborted) {
        setIsFileLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (route.page === "file") {
      void loadFile(route.path);
      return;
    }

    resetFileViewer();
  }, [route, loadFile, resetFileViewer]);

  useEffect(() => {
    if (route.page === "file") {
      setIsGoToFileOpen(false);
    }
  }, [route]);

  const openFilePage = useCallback(
    (path: string) => {
      const params = new URLSearchParams();
      params.set("path", path);

      window.history.pushState(
        { page: "file", path },
        "",
        `/file?${params.toString()}`,
      );

      setRoute({ page: "file", path });
    },
    [setRoute],
  );

  const handleGoToFileToggle = useCallback(() => {
    setIsGoToFileOpen((previous) => !previous);
  }, []);

  const handleCloseGoToFile = useCallback(() => {
    setIsGoToFileOpen(false);
  }, []);

  const handleOpenFileFromSearch = useCallback(
    (path: string) => {
      openFilePage(path);
      setIsGoToFileOpen(false);
    },
    [openFilePage],
  );

  const handleBackToBrowser = useCallback(() => {
    const state = window.history.state as RouteState | null;

    if (state && state.page === "file") {
      window.history.back();
      return;
    }

    window.history.replaceState({ page: "list" }, "", "/");
    setRoute({ page: "list" });
  }, [setRoute]);

  const currentDirectoryLabel = currentDirectory ? `/${currentDirectory}` : "/";
  const canNavigateUp = parentDirectory !== null;

  const handleNavigateUp = () => {
    if (!canNavigateUp) {
      return;
    }

    resetFileViewer();
    setCurrentDirectory(parentDirectory ?? "");
  };

  const handleDirectoryClick = (item: FileListItem) => {
    if (item.kind !== "directory") {
      return;
    }

    resetFileViewer();
    setCurrentDirectory(item.path);
  };

  const handleFileClick = (item: FileListItem) => {
    if (item.kind !== "file") {
      return;
    }

    openFilePage(item.path);
  };

  const isFileRoute = route.page === "file";
  const displayedFilePath =
    activeFilePath ?? (route.page === "file" ? route.path : null);

  return (
    <main className="min-h-screen bg-slate-950 pb-28 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
        {isFileRoute ? (
          <FilePreview
            projectName={projectName}
            displayedFilePath={displayedFilePath}
            selectedFile={selectedFile}
            isFileLoading={isFileLoading}
            fileError={fileError}
            onBackToBrowser={handleBackToBrowser}
          />
        ) : (
          <FileBrowser
            projectName={projectName}
            currentDirectoryLabel={currentDirectoryLabel}
            canNavigateUp={canNavigateUp}
            onNavigateUp={handleNavigateUp}
            isLoading={isLoading}
            error={error}
            files={files}
            activeFilePath={activeFilePath}
            isFileLoading={isFileLoading}
            onDirectoryClick={handleDirectoryClick}
            onFileClick={handleFileClick}
          />
        )}
      </section>
      <GoToFileSearch
        isOpen={isGoToFileOpen}
        onClose={handleCloseGoToFile}
        onOpenFile={handleOpenFileFromSearch}
      />
      <Toolbar
        onGoToFileToggle={handleGoToFileToggle}
        isGoToFileOpen={isGoToFileOpen}
      />
    </main>
  );
}

export default App;
