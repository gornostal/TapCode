import { useCallback, useEffect, useRef, useState } from "react";

import type {
  FileContentResponse,
  FileListItem,
  FilesResponse,
} from "@shared/files";

import FileBrowser from "@/components/FileBrowser";
import FilePreview from "@/components/FilePreview";
import GitDiff from "@/components/GitDiff";
import GitStatus from "@/components/GitStatus";
import GoToFileSearch from "@/components/GoToFileSearch";
import CommandRunner from "@/components/CommandRunner";
import CommandOutput from "@/components/CommandOutput";
import Header from "@/components/Header";
import TaskList from "@/components/TaskList";
import TabBar from "@/components/TabBar";

type RouteState =
  | {
      page: "list";
    }
  | {
      page: "file";
      path: string;
    }
  | {
      page: "tasks";
    }
  | {
      page: "commands";
    }
  | {
      page: "command-output";
      sessionId: string;
    }
  | {
      page: "git-status";
    }
  | {
      page: "git-diff";
    };

const parseRoute = (): RouteState => {
  const { pathname, search } = window.location;

  if (pathname.startsWith("/tasks")) {
    return { page: "tasks" };
  }

  if (pathname.startsWith("/commands")) {
    return { page: "commands" };
  }

  if (pathname.startsWith("/command-output")) {
    const params = new URLSearchParams(search);
    const sessionId = params.get("sessionId");

    if (sessionId && sessionId.trim()) {
      return { page: "command-output", sessionId };
    }
  }

  if (pathname.startsWith("/git/status")) {
    return { page: "git-status" };
  }

  if (pathname.startsWith("/git/diff")) {
    return { page: "git-diff" };
  }

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

  const openTasksPage = useCallback(() => {
    window.history.pushState({ page: "tasks" }, "", "/tasks");
    setRoute({ page: "tasks" });
  }, [setRoute]);

  const openCommandsPage = useCallback(() => {
    window.history.pushState({ page: "commands" }, "", "/commands");
    setRoute({ page: "commands" });
  }, [setRoute]);

  const openCommandOutputPage = useCallback(
    (sessionId: string) => {
      const params = new URLSearchParams();
      params.set("sessionId", sessionId);

      window.history.pushState(
        { page: "command-output", sessionId },
        "",
        `/command-output?${params.toString()}`,
      );

      setRoute({ page: "command-output", sessionId });
    },
    [setRoute],
  );

  const openGitStatusPage = useCallback(() => {
    window.history.pushState({ page: "git-status" }, "", "/git/status");
    setRoute({ page: "git-status" });
  }, [setRoute]);

  const openGitDiffPage = useCallback(() => {
    window.history.pushState({ page: "git-diff" }, "", "/git/diff");
    setRoute({ page: "git-diff" });
  }, [setRoute]);

  const handleBackToBrowser = useCallback(() => {
    const state = window.history.state as RouteState | null;

    if (
      state &&
      (state.page === "file" ||
        state.page === "tasks" ||
        state.page === "commands" ||
        state.page === "command-output" ||
        state.page === "git-status" ||
        state.page === "git-diff")
    ) {
      window.history.back();
      return;
    }

    window.history.replaceState({ page: "list" }, "", "/");
    setRoute({ page: "list" });
  }, [setRoute]);

  const handleNavigateToRoot = useCallback(() => {
    window.history.pushState({ page: "list" }, "", "/");
    setRoute({ page: "list" });
    resetFileViewer();
    setCurrentDirectory("");
  }, [setRoute, resetFileViewer]);

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
  const isTaskRoute = route.page === "tasks";
  const isCommandsRoute = route.page === "commands";
  const isCommandOutputRoute = route.page === "command-output";
  const isGitStatusRoute = route.page === "git-status";
  const isGitDiffRoute = route.page === "git-diff";
  const isGitRouteActive = isGitStatusRoute || isGitDiffRoute;
  const displayedFilePath =
    activeFilePath ?? (route.page === "file" ? route.path : null);

  useEffect(() => {
    if (route.page !== "list") {
      setIsGoToFileOpen(false);
    }
  }, [route]);

  return (
    <main className="min-h-screen bg-slate-950 pb-28 text-slate-100">
      <Header projectName={projectName} />
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-20 pb-12 sm:px-6 lg:px-8">
        {isFileRoute ? (
          <FilePreview
            projectName={projectName}
            displayedFilePath={displayedFilePath}
            selectedFile={selectedFile}
            isFileLoading={isFileLoading}
            fileError={fileError}
            onBackToBrowser={handleBackToBrowser}
          />
        ) : isTaskRoute ? (
          <TaskList
            onBackToBrowser={handleBackToBrowser}
            onOpenCommandOutput={openCommandOutputPage}
          />
        ) : isCommandsRoute ? (
          <CommandRunner
            onBackToBrowser={handleBackToBrowser}
            onOpenCommandOutput={openCommandOutputPage}
          />
        ) : isCommandOutputRoute ? (
          <CommandOutput
            sessionId={route.sessionId}
            onBackToBrowser={handleBackToBrowser}
          />
        ) : isGitStatusRoute ? (
          <GitStatus
            onBackToBrowser={handleBackToBrowser}
            onOpenGitDiff={openGitDiffPage}
            onOpenFile={openFilePage}
          />
        ) : isGitDiffRoute ? (
          <GitDiff onBackToBrowser={handleBackToBrowser} />
        ) : (
          <FileBrowser
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
      <TabBar
        onNavigateToRoot={handleNavigateToRoot}
        onGoToFileToggle={handleGoToFileToggle}
        isGoToFileOpen={isGoToFileOpen}
        onOpenCommands={openCommandsPage}
        isCommandsActive={isCommandsRoute}
        onOpenTaskList={openTasksPage}
        isTaskListActive={isTaskRoute}
        onOpenGitStatus={openGitStatusPage}
        isGitActive={isGitRouteActive}
      />
    </main>
  );
}

export default App;
