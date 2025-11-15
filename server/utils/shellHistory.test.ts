import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

let readBashHistory: typeof import("./shellHistory").readBashHistory;
let readZshHistory: typeof import("./shellHistory").readZshHistory;
let readFishHistory: typeof import("./shellHistory").readFishHistory;
let fuzzySearchHistory: typeof import("./shellHistory").fuzzySearchHistory;

let testHome: string;

// Mock the os module
vi.mock("os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("os")>();
  return {
    ...actual,
    homedir: vi.fn(() => testHome),
  };
});

beforeEach(async () => {
  // Create test home directory
  testHome = join(tmpdir(), "shellhistory-test-" + Date.now());
  mkdirSync(testHome, { recursive: true });

  // Reset modules and re-import to get fresh instances
  vi.resetModules();
  ({ readBashHistory, readZshHistory, readFishHistory, fuzzySearchHistory } =
    await import("./shellHistory"));
});

afterEach(() => {
  // Clean up test directory
  try {
    rmSync(testHome, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

describe("readBashHistory", () => {
  it("should read simple bash history without timestamps", () => {
    const historyContent = `ls -la
cd /home/user
echo "hello world"
git status
npm install`;

    writeFileSync(join(testHome, ".bash_history"), historyContent);

    const result = readBashHistory(5);

    expect(result).toHaveLength(5);
    expect(result[0].command).toBe("npm install");
    expect(result[1].command).toBe("git status");
    expect(result[2].command).toBe('echo "hello world"');
    expect(result[3].command).toBe("cd /home/user");
    expect(result[4].command).toBe("ls -la");
  });

  it("should read bash history with timestamps", () => {
    const historyContent = `#1680589220
ls -la
#1680589225
cd /home
#1680589230
echo "test"`;

    writeFileSync(join(testHome, ".bash_history"), historyContent);

    const result = readBashHistory(3);

    expect(result).toHaveLength(3);
    expect(result[0].command).toBe('echo "test"');
    expect(result[0].timestamp).toBe(1680589230);
    expect(result[1].command).toBe("cd /home");
    expect(result[1].timestamp).toBe(1680589225);
    expect(result[2].command).toBe("ls -la");
    expect(result[2].timestamp).toBe(1680589220);
  });

  it("should respect limit parameter", () => {
    const historyContent = `command1
command2
command3
command4
command5
command6
command7
command8
command9
command10`;

    writeFileSync(join(testHome, ".bash_history"), historyContent);

    const result = readBashHistory(3);

    expect(result).toHaveLength(3);
    expect(result[0].command).toBe("command10");
    expect(result[1].command).toBe("command9");
    expect(result[2].command).toBe("command8");
  });

  it("should return empty array when file does not exist", () => {
    const result = readBashHistory(10);
    expect(result).toEqual([]);
  });

  it("should filter out empty lines", () => {
    const historyContent = `command1

command2


command3`;

    writeFileSync(join(testHome, ".bash_history"), historyContent);

    const result = readBashHistory(10);

    expect(result).toHaveLength(3);
    expect(result[0].command).toBe("command3");
    expect(result[1].command).toBe("command2");
    expect(result[2].command).toBe("command1");
  });
});

describe("readZshHistory", () => {
  it("should read zsh extended history format", () => {
    const historyContent = `: 1458291931:0;ls -l
: 1449561637:0;echo "foobar"
: 1636402372:5;npm run build`;

    writeFileSync(join(testHome, ".zsh_history"), historyContent);

    const result = readZshHistory(3);

    expect(result).toHaveLength(3);
    expect(result[0].command).toBe("npm run build");
    expect(result[0].timestamp).toBe(1636402372);
    expect(result[1].command).toBe('echo "foobar"');
    expect(result[1].timestamp).toBe(1449561637);
    expect(result[2].command).toBe("ls -l");
    expect(result[2].timestamp).toBe(1458291931);
  });

  it("should handle commands with semicolons in them", () => {
    const historyContent = `: 1458291931:0;for i in 1 2 3; do echo $i; done
: 1449561637:0;echo "test;with;semicolons"`;

    writeFileSync(join(testHome, ".zsh_history"), historyContent);

    const result = readZshHistory(2);

    expect(result).toHaveLength(2);
    expect(result[0].command).toBe('echo "test;with;semicolons"');
    expect(result[1].command).toBe("for i in 1 2 3; do echo $i; done");
  });

  it("should read plain zsh history without extended format", () => {
    const historyContent = `ls -la
cd /home
git status`;

    writeFileSync(join(testHome, ".zsh_history"), historyContent);

    const result = readZshHistory(3);

    expect(result).toHaveLength(3);
    expect(result[0].command).toBe("git status");
    expect(result[1].command).toBe("cd /home");
    expect(result[2].command).toBe("ls -la");
    expect(result[0].timestamp).toBeUndefined();
  });

  it("should respect limit parameter", () => {
    const historyContent = `: 1:0;command1
: 2:0;command2
: 3:0;command3
: 4:0;command4
: 5:0;command5`;

    writeFileSync(join(testHome, ".zsh_history"), historyContent);

    const result = readZshHistory(2);

    expect(result).toHaveLength(2);
    expect(result[0].command).toBe("command5");
    expect(result[1].command).toBe("command4");
  });

  it("should return empty array when file does not exist", () => {
    const result = readZshHistory(10);
    expect(result).toEqual([]);
  });
});

describe("readFishHistory", () => {
  it("should read fish history YAML-like format", () => {
    const historyContent = `- cmd: cat some/file/path
  when: 1636402372
  paths:
    - some/file/path
- cmd: ls -la
  when: 1636402380
- cmd: git status
  when: 1636402390`;

    mkdirSync(join(testHome, ".local/share/fish"), { recursive: true });
    writeFileSync(
      join(testHome, ".local/share/fish/fish_history"),
      historyContent,
    );

    const result = readFishHistory(3);

    expect(result).toHaveLength(3);
    expect(result[0].command).toBe("git status");
    expect(result[0].timestamp).toBe(1636402390);
    expect(result[1].command).toBe("ls -la");
    expect(result[1].timestamp).toBe(1636402380);
    expect(result[2].command).toBe("cat some/file/path");
    expect(result[2].timestamp).toBe(1636402372);
  });

  it("should handle fish history without paths field", () => {
    const historyContent = `- cmd: echo "hello"
  when: 1636402372
- cmd: pwd
  when: 1636402380`;

    mkdirSync(join(testHome, ".local/share/fish"), { recursive: true });
    writeFileSync(
      join(testHome, ".local/share/fish/fish_history"),
      historyContent,
    );

    const result = readFishHistory(2);

    expect(result).toHaveLength(2);
    expect(result[0].command).toBe("pwd");
    expect(result[1].command).toBe('echo "hello"');
  });

  it("should unescape fish special characters", () => {
    const historyContent = `- cmd: echo "line1\\nline2"
  when: 1636402372
- cmd: echo "backslash: \\\\"
  when: 1636402380`;

    mkdirSync(join(testHome, ".local/share/fish"), { recursive: true });
    writeFileSync(
      join(testHome, ".local/share/fish/fish_history"),
      historyContent,
    );

    const result = readFishHistory(2);

    expect(result).toHaveLength(2);
    expect(result[0].command).toBe('echo "backslash: \\"');
    expect(result[1].command).toBe('echo "line1\nline2"');
  });

  it("should handle commands without when field", () => {
    const historyContent = `- cmd: ls
- cmd: pwd
  when: 1636402380`;

    mkdirSync(join(testHome, ".local/share/fish"), { recursive: true });
    writeFileSync(
      join(testHome, ".local/share/fish/fish_history"),
      historyContent,
    );

    const result = readFishHistory(2);

    expect(result).toHaveLength(2);
    expect(result[0].command).toBe("pwd");
    expect(result[0].timestamp).toBe(1636402380);
    expect(result[1].command).toBe("ls");
    expect(result[1].timestamp).toBeUndefined();
  });

  it("should respect limit parameter", () => {
    const historyContent = `- cmd: command1
  when: 1
- cmd: command2
  when: 2
- cmd: command3
  when: 3
- cmd: command4
  when: 4
- cmd: command5
  when: 5`;

    mkdirSync(join(testHome, ".local/share/fish"), { recursive: true });
    writeFileSync(
      join(testHome, ".local/share/fish/fish_history"),
      historyContent,
    );

    const result = readFishHistory(3);

    expect(result).toHaveLength(3);
    expect(result[0].command).toBe("command5");
    expect(result[1].command).toBe("command4");
    expect(result[2].command).toBe("command3");
  });

  it("should return empty array when file does not exist", () => {
    const result = readFishHistory(10);
    expect(result).toEqual([]);
  });

  it("should handle compact fish history format without dashes", () => {
    const historyContent = `cmd: git add .
when: 1636402372
cmd: git commit -m "test"
when: 1636402380`;

    mkdirSync(join(testHome, ".local/share/fish"), { recursive: true });
    writeFileSync(
      join(testHome, ".local/share/fish/fish_history"),
      historyContent,
    );

    const result = readFishHistory(2);

    expect(result).toHaveLength(2);
    expect(result[0].command).toBe('git commit -m "test"');
    expect(result[0].timestamp).toBe(1636402380);
    expect(result[1].command).toBe("git add .");
    expect(result[1].timestamp).toBe(1636402372);
  });
});

describe("fuzzySearchHistory", () => {
  it("should return empty array for empty query", () => {
    const result = fuzzySearchHistory("", 10);
    expect(result).toEqual([]);
  });

  it("should return empty array for whitespace-only query", () => {
    const result = fuzzySearchHistory("   ", 10);
    expect(result).toEqual([]);
  });

  it("should find exact matches", () => {
    const historyContent = `ls -la
cd /home
git status
npm install
docker ps`;

    writeFileSync(join(testHome, ".bash_history"), historyContent);

    const result = fuzzySearchHistory("git status", 10);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].command).toBe("git status");
  });

  it("should find substring matches", () => {
    const historyContent = `ls -la
cd /home
git status
npm install
docker ps`;

    writeFileSync(join(testHome, ".bash_history"), historyContent);

    const result = fuzzySearchHistory("git", 10);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].command).toBe("git status");
  });

  it("should order substring matches by most recent timestamp", () => {
    const historyContent = `#1000
npm run build
#2000
npm run test
#1500
npm run lint`;

    writeFileSync(join(testHome, ".bash_history"), historyContent);

    const result = fuzzySearchHistory("npm run", 10);

    expect(result).toHaveLength(3);
    expect(result[0].command).toBe("npm run test");
    expect(result[1].command).toBe("npm run lint");
    expect(result[2].command).toBe("npm run build");
  });

  it("should fall back to fuse search ordered by score when no substring matches", () => {
    const historyContent = `git status
git stash
git commit`;

    writeFileSync(join(testHome, ".bash_history"), historyContent);

    const result = fuzzySearchHistory("gstat", 10);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].command).toBe("git status");
    expect(result[1].command).toBe("git stash");
  });

  it("should respect limit parameter", () => {
    const historyContent = `git status
git add .
git commit
git push
git pull
git log`;

    writeFileSync(join(testHome, ".bash_history"), historyContent);

    const result = fuzzySearchHistory("git", 3);

    expect(result).toHaveLength(3);
  });

  it("should be case insensitive", () => {
    const historyContent = `Git Status
git add .
GIT COMMIT`;

    writeFileSync(join(testHome, ".bash_history"), historyContent);

    const result = fuzzySearchHistory("GIT", 10);

    expect(result).toHaveLength(3);
  });

  it("should deduplicate commands across different shells", () => {
    const bashContent = `git status
npm install`;
    const zshContent = `: 1458291931:0;git status
: 1449561637:0;docker ps`;

    writeFileSync(join(testHome, ".bash_history"), bashContent);
    writeFileSync(join(testHome, ".zsh_history"), zshContent);

    const result = fuzzySearchHistory("git", 10);

    // "git status" appears in both bash and zsh history, should only appear once
    const gitStatusCount = result.filter(
      (r) => r.command === "git status",
    ).length;
    expect(gitStatusCount).toBe(1);
  });

  it("should prefer more recent timestamp when deduplicating", () => {
    const bashContent = `#1000000000
git status`;
    const zshContent = `: 2000000000:0;git status`;

    writeFileSync(join(testHome, ".bash_history"), bashContent);
    writeFileSync(join(testHome, ".zsh_history"), zshContent);

    const result = fuzzySearchHistory("git", 10);

    expect(result).toHaveLength(1);
    expect(result[0].command).toBe("git status");
    // Should keep the zsh entry with timestamp 2000000000
    expect(result[0].timestamp).toBe(2000000000);
  });

  it("should handle special regex characters in query", () => {
    const historyContent = `echo "test"
grep -r "pattern" .
npm run build`;

    writeFileSync(join(testHome, ".bash_history"), historyContent);

    const result = fuzzySearchHistory("grep -r", 10);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].command).toBe('grep -r "pattern" .');
  });

  it("should work with commands from fish history", () => {
    const fishContent = `- cmd: cat some/file
  when: 1636402372
- cmd: git status
  when: 1636402380`;

    mkdirSync(join(testHome, ".local/share/fish"), { recursive: true });
    writeFileSync(
      join(testHome, ".local/share/fish/fish_history"),
      fishContent,
    );

    const result = fuzzySearchHistory("git", 10);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].command).toBe("git status");
  });
});
