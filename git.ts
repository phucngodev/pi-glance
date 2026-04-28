import { execFile } from "node:child_process";
import type { GitConfig, GitSnapshot, GitStatus } from "./types.js";

const GIT_ARGS = ["--no-optional-locks", "status", "--porcelain=v2", "--branch", "--show-stash"] as const;

export function emptyGitSnapshot(status: GitStatus = "unknown"): GitSnapshot {
	return {
		repo: false,
		branch: null,
		detached: false,
		sha: null,
		upstream: null,
		ahead: 0,
		behind: 0,
		staged: 0,
		unstaged: 0,
		untracked: 0,
		conflicts: 0,
		dirty: false,
		status,
		updatedAt: Date.now(),
	};
}

function shortSha(oid: string | null): string | null {
	if (!oid || oid === "(initial)") return null;
	return oid.slice(0, 7);
}

function countStatusPair(pair: string, counts: { staged: number; unstaged: number }): void {
	const staged = pair[0];
	const unstaged = pair[1];
	if (staged && staged !== ".") counts.staged++;
	if (unstaged && unstaged !== ".") counts.unstaged++;
}

function parseGitStatus(output: string, now = Date.now()): GitSnapshot {
	let branch: string | null = null;
	let detached = false;
	let oid: string | null = null;
	let upstream: string | null = null;
	let ahead = 0;
	let behind = 0;
	let staged = 0;
	let unstaged = 0;
	let untracked = 0;
	let conflicts = 0;

	for (const line of output.split(/\r?\n/)) {
		if (!line) continue;
		if (line.startsWith("# branch.oid ")) {
			oid = line.slice("# branch.oid ".length).trim();
			continue;
		}
		if (line.startsWith("# branch.head ")) {
			const head = line.slice("# branch.head ".length).trim();
			detached = head === "(detached)";
			branch = detached ? null : head;
			continue;
		}
		if (line.startsWith("# branch.upstream ")) {
			upstream = line.slice("# branch.upstream ".length).trim() || null;
			continue;
		}
		if (line.startsWith("# branch.ab ")) {
			const match = line.match(/\+([0-9]+)\s+-([0-9]+)/);
			if (match) {
				ahead = Number.parseInt(match[1]!, 10);
				behind = Number.parseInt(match[2]!, 10);
			}
			continue;
		}
		if (line.startsWith("1 ") || line.startsWith("2 ")) {
			const pair = line.slice(2).split(" ", 1)[0] ?? "..";
			const counts = { staged, unstaged };
			countStatusPair(pair, counts);
			staged = counts.staged;
			unstaged = counts.unstaged;
			continue;
		}
		if (line.startsWith("? ")) {
			untracked++;
			continue;
		}
		if (line.startsWith("u ")) {
			conflicts++;
		}
	}

	const sha = shortSha(oid);
	const dirty = staged > 0 || unstaged > 0 || untracked > 0 || conflicts > 0;
	const status: GitStatus = conflicts > 0 ? "conflict" : dirty ? "dirty" : "clean";

	return {
		repo: true,
		branch,
		detached,
		sha,
		upstream,
		ahead,
		behind,
		staged,
		unstaged,
		untracked,
		conflicts,
		dirty,
		status,
		updatedAt: now,
	};
}

function collectGitSnapshot(cwd: string, config: GitConfig): Promise<GitSnapshot> {
	return new Promise((resolve) => {
		execFile("git", [...GIT_ARGS], { cwd, timeout: config.timeoutMs, maxBuffer: 512 * 1024 }, (error, stdout) => {
			if (error) {
				resolve(emptyGitSnapshot("unknown"));
				return;
			}
			resolve(parseGitStatus(stdout));
		});
	});
}

export class GitRefresher {
	private timer: NodeJS.Timeout | undefined;
	private inFlight = false;
	private pending = false;
	private disposed = false;

	constructor(
		private readonly getConfig: () => GitConfig,
		private readonly getCwd: () => string | undefined,
		private readonly onSnapshot: (cwd: string, snapshot: GitSnapshot) => void,
	) {}

	dispose(): void {
		this.disposed = true;
		if (this.timer) clearTimeout(this.timer);
		this.timer = undefined;
	}

	schedule(immediate = false): void {
		if (this.disposed) return;
		if (this.timer) clearTimeout(this.timer);
		const delay = immediate ? 0 : this.getConfig().refreshDebounceMs;
		this.timer = setTimeout(() => {
			this.timer = undefined;
			void this.refresh();
		}, delay);
		this.timer.unref?.();
	}

	private async refresh(): Promise<void> {
		if (this.disposed) return;
		if (this.inFlight) {
			this.pending = true;
			return;
		}
		const cwd = this.getCwd();
		if (!cwd) return;
		this.inFlight = true;
		try {
			const snapshot = await collectGitSnapshot(cwd, this.getConfig());
			if (!this.disposed) this.onSnapshot(cwd, snapshot);
		} finally {
			this.inFlight = false;
			if (this.pending && !this.disposed) {
				this.pending = false;
				this.schedule(true);
			}
		}
	}
}
