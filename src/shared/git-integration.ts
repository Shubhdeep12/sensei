import { simpleGit, SimpleGit, LogResult, BranchSummary } from 'simple-git';
import { join } from 'path';
import { GitInfo, FileGitInfo } from './types.js';

export class GitIntegration {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async getGitInfo(): Promise<GitInfo> {
    try {
      // Check if it's a git repository
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        return {
          isGitRepo: false,
          branches: [],
          tags: [],
          commitCount: 0,
        };
      }

      // Get current branch
      const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);

      // Get all branches
      const branchSummary: BranchSummary = await this.git.branch();
      const branches = Object.keys(branchSummary.branches);

      // Get all tags
      const tags = await this.git.tags();

      // Get last commit
      const log = await this.git.log({ maxCount: 1 });
      const lastCommit = log.latest
        ? {
            hash: log.latest.hash,
            message: log.latest.message,
            author: `${log.latest.author_name} <${log.latest.author_email}>`,
            date: log.latest.date,
          }
        : undefined;

      // Get commit count
      const commitCount = await this.git.raw(['rev-list', '--count', 'HEAD']);

      // Get remote URL
      let remoteUrl: string | undefined;
      try {
        remoteUrl = (await this.git.remote(['get-url', 'origin'])) || undefined;
      } catch {
        // No remote configured
      }

      return {
        isGitRepo: true,
        currentBranch,
        branches,
        tags: tags.all,
        lastCommit,
        commitCount: parseInt(commitCount.trim()) || 0,
        remoteUrl,
      };
    } catch (error) {
      console.warn(`Failed to get git info for ${this.repoPath}:`, error);
      return {
        isGitRepo: false,
        branches: [],
        tags: [],
        commitCount: 0,
      };
    }
  }

  async getFileGitInfo(filePath: string): Promise<FileGitInfo | null> {
    try {
      const relativePath = filePath.replace(this.repoPath + '/', '');

      // Check if file is tracked
      const isTracked = await this.git.raw(['ls-files', '--error-unmatch', relativePath]);

      if (isTracked.trim() === '') {
        return {
          path: relativePath,
          lastModified: new Date().toISOString(),
          author: 'Unknown',
          commitHash: 'untracked',
          commitMessage: 'File not tracked by git',
          lineCount: 0,
          isTracked: false,
        };
      }

      // Get file history
      const log = await this.git.log({ file: relativePath, maxCount: 1 });
      const lastCommit = log.latest || undefined;

      if (!lastCommit) {
        return null;
      }

      // Get line count using system command
      let lines = 0;
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const { stdout } = await execAsync(`wc -l "${relativePath}"`);
        lines = parseInt(stdout.trim().split(' ')[0]) || 0;
      } catch {
        // Fallback: count lines in content
        lines = 0;
      }

      return {
        path: relativePath,
        lastModified: lastCommit.date,
        author: `${lastCommit.author_name} <${lastCommit.author_email}>`,
        commitHash: lastCommit.hash,
        commitMessage: lastCommit.message,
        lineCount: lines,
        isTracked: true,
      };
    } catch (error) {
      console.warn(`Failed to get git info for file ${filePath}:`, error);
      return null;
    }
  }

  async getCommitHistory(filePath?: string, maxCount: number = 10): Promise<LogResult> {
    try {
      const options: any = { maxCount };
      if (filePath) {
        const relativePath = filePath.replace(this.repoPath + '/', '');
        options.file = relativePath;
      }

      return await this.git.log(options);
    } catch (error) {
      console.warn(`Failed to get commit history:`, error);
      return { all: [], total: 0, latest: null };
    }
  }

  async getFileDiff(filePath: string, commitHash?: string): Promise<string> {
    try {
      const relativePath = filePath.replace(this.repoPath + '/', '');

      if (commitHash) {
        return (await this.git.diff([commitHash, '--', relativePath])) || '';
      } else {
        return (await this.git.diff(['--', relativePath])) || '';
      }
    } catch (error) {
      console.warn(`Failed to get diff for ${filePath}:`, error);
      return '';
    }
  }

  async getBlameInfo(filePath: string): Promise<any[]> {
    try {
      const relativePath = filePath.replace(this.repoPath + '/', '');
      const blame = await this.git.raw(['blame', '--porcelain', relativePath]);

      // Parse blame output
      const lines = blame.split('\n') || [];
      const blameInfo: any[] = [];
      let currentCommit: any = {};

      for (const line of lines) {
        if (line.startsWith('^')) {
          // Commit info
          const hash = line.substring(1);
          currentCommit = { hash };
        } else if (line.startsWith('author ')) {
          currentCommit.author = line.substring(7);
        } else if (line.startsWith('author-mail ')) {
          currentCommit.authorEmail = line.substring(12);
        } else if (line.startsWith('author-time ')) {
          currentCommit.authorTime = parseInt(line.substring(12));
        } else if (line.startsWith('summary ')) {
          currentCommit.summary = line.substring(8);
        } else if (line.startsWith('\t')) {
          // Code line
          blameInfo.push({
            ...currentCommit,
            line: line.substring(1),
          });
        }
      }

      return blameInfo;
    } catch (error) {
      console.warn(`Failed to get blame info for ${filePath}:`, error);
      return [];
    }
  }

  async getStagedFiles(): Promise<string[]> {
    try {
      const status = await this.git.status();
      return status.staged || [];
    } catch (error) {
      console.warn(`Failed to get staged files:`, error);
      return [];
    }
  }

  async getModifiedFiles(): Promise<string[]> {
    try {
      const status = await this.git.status();
      return [...(status.modified || []), ...(status.not_added || [])];
    } catch (error) {
      console.warn(`Failed to get modified files:`, error);
      return [];
    }
  }
}
