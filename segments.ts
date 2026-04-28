import { formatCost, formatPercent, formatTokens } from "./format.js";
import type { SegmentData, SegmentDefinition, SegmentRenderContext, SegmentRenderResult } from "./types.js";

function configuredPriority(ctx: SegmentRenderContext, segment: SegmentDefinition): number {
	const config = ctx.config.segments.find((s) => s.id === segment.id);
	return config?.priority ?? segment.defaultPriority;
}

function displayForMode(data: SegmentData, widthMode: SegmentRenderContext["widthMode"]): string {
	if (widthMode === "minimal" && data.display?.minimal !== undefined) return data.display.minimal;
	if (widthMode === "compact" && data.display?.compact !== undefined) return data.display.compact;
	if (widthMode === "full" && data.display?.full !== undefined) return data.display.full;
	const secondary = data.secondary ? ` ${data.secondary}` : "";
	return `${data.primary}${secondary}`.trim();
}

function renderCollectedSegment(ctx: SegmentRenderContext, segment: SegmentDefinition, data: SegmentData): SegmentRenderResult {
	const icon = ctx.icons[segment.id];
	const value = displayForMode(data, ctx.widthMode);
	const prefix = icon ? `${icon} ` : "";
	return {
		id: segment.id,
		text: `${prefix}${value}`.trim(),
		priority: configuredPriority(ctx, segment),
	};
}

function gitBranchLabel(ctx: SegmentRenderContext): string {
	const git = ctx.state.git;
	return git.branch || (git.detached && git.sha ? git.sha : "HEAD");
}

function gitStatusMark(ctx: SegmentRenderContext): string {
	const status = ctx.state.git.status;
	if (status === "conflict") return ctx.config.icons === "nerd" ? "⚠" : "!";
	if (status === "dirty") return ctx.config.icons === "nerd" ? "●" : "*";
	return "";
}

function gitDetailParts(ctx: SegmentRenderContext): string[] {
	const git = ctx.state.git;
	const parts: string[] = [];
	const status = gitStatusMark(ctx);
	if (ctx.config.git.showDirty && status) parts.push(status);
	if (ctx.config.git.showAheadBehind) {
		if (git.ahead > 0) parts.push(`↑${git.ahead}`);
		if (git.behind > 0) parts.push(`↓${git.behind}`);
	}
	return parts;
}

const SEGMENTS: SegmentDefinition[] = [
	{
		id: "git",
		label: "Git",
		defaultPriority: 65,
		collect(ctx) {
			const git = ctx.state.git;
			if (!git.repo) return undefined;
			const branch = gitBranchLabel(ctx);
			const parts = gitDetailParts(ctx);
			const secondary = parts.join(" ") || undefined;
			return {
				primary: branch,
				secondary,
				display: {
					full: [branch, secondary].filter(Boolean).join(" "),
					compact: [branch, secondary].filter(Boolean).join(" "),
					minimal: [branch, gitStatusMark(ctx)].filter(Boolean).join(" "),
				},
				metadata: {
					repo: true,
					branch: git.branch,
					detached: git.detached,
					status: git.status,
					ahead: git.ahead,
					behind: git.behind,
					sha: git.sha,
				},
			};
		},
	},
	{
		id: "model",
		label: "Model",
		defaultPriority: 100,
		collect(ctx) {
			let model = ctx.state.model.displayName || ctx.state.model.id || "no-model";
			if (ctx.showProvider && ctx.state.model.provider && ctx.widthMode === "full") {
				model = `${ctx.state.model.provider}/${model}`;
			}
			const thinking = ctx.state.model.thinking && ctx.state.model.thinking !== "off" ? ctx.state.model.thinking : "";
			return {
				primary: model,
				secondary: thinking || undefined,
				display: {
					full: thinking ? `${model} ${thinking}` : model,
					compact: thinking ? `${model} ${thinking}` : model,
					minimal: model,
				},
				metadata: {
					id: ctx.state.model.id ?? null,
					provider: ctx.state.model.provider ?? null,
					displayName: ctx.state.model.displayName ?? null,
					thinking: ctx.state.model.thinking || null,
				},
			};
		},
	},
	{
		id: "context",
		label: "Context",
		defaultPriority: 95,
		collect(ctx) {
			const pct = formatPercent(ctx.state.context.percent);
			const tokens = formatTokens(ctx.state.context.tokens);
			const window = formatTokens(ctx.state.context.window);
			return {
				primary: pct,
				secondary: `${tokens}/${window}`,
				display: {
					full: `${pct} ${tokens}/${window}`,
					compact: pct,
					minimal: pct,
				},
				metadata: {
					known: ctx.state.context.percent !== null && ctx.state.context.tokens !== null,
					percent: ctx.state.context.percent,
					tokens: ctx.state.context.tokens,
					window: ctx.state.context.window,
				},
			};
		},
	},
	{
		id: "tokens",
		label: "Tokens",
		defaultPriority: 55,
		collect(ctx) {
			const usage = ctx.state.usage;
			const primary = `↑${formatTokens(usage.input)} ↓${formatTokens(usage.output)}`;
			const cacheParts = [];
			if (usage.cacheRead) cacheParts.push(`R${formatTokens(usage.cacheRead)}`);
			if (usage.cacheWrite) cacheParts.push(`W${formatTokens(usage.cacheWrite)}`);
			return {
				primary,
				secondary: cacheParts.join(" ") || undefined,
				display: {
					full: [primary, ...cacheParts].join(" "),
					compact: primary,
					minimal: primary,
				},
				metadata: {
					input: usage.input,
					output: usage.output,
					cacheRead: usage.cacheRead,
					cacheWrite: usage.cacheWrite,
					total: usage.input + usage.output + usage.cacheRead + usage.cacheWrite,
				},
			};
		},
	},
	{
		id: "cost",
		label: "Cost",
		defaultPriority: 35,
		collect(ctx) {
			return {
				primary: formatCost(ctx.state.usage.cost),
				metadata: {
					usd: ctx.state.usage.cost,
				},
			};
		},
	},
];

export function renderSegment(ctx: SegmentRenderContext, segment: SegmentDefinition): SegmentRenderResult | undefined {
	const data = segment.collect(ctx);
	return data ? renderCollectedSegment(ctx, segment, data) : undefined;
}

export const SEGMENT_BY_ID = new Map(SEGMENTS.map((segment) => [segment.id, segment]));
