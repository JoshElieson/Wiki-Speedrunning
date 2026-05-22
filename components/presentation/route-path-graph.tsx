"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { RunStatusValue, RunStepDetail } from "@/server/types/run-history";
import { cn } from "@/utils/cn";
import { formatDuration } from "@/utils/format";

interface RoutePathGraphProps {
  steps: RunStepDetail[];
  status: RunStatusValue;
}

interface GraphNode extends RunStepDetail {
  graphIndex: number;
  revisitCount: number;
  branchRow: number;
  previousVisitGraphIndex?: number;
}

const COLUMN_WIDTH = 220;
const ROW_HEIGHT = 140;
const NODE_WIDTH = 188;
const NODE_HEIGHT = 92;
const SVG_PADDING_X = 24;
const SVG_PADDING_Y = 26;

function buildGraphNodes(steps: RunStepDetail[]): GraphNode[] {
  const visitsByTitle = new Map<string, number[]>();

  return steps.map((step, graphIndex) => {
    const priorVisits = visitsByTitle.get(step.normalizedArticleTitle) ?? [];
    const previousVisitGraphIndex = priorVisits.at(-1);
    const revisitCount = priorVisits.length;
    const branchRow = revisitCount > 0 ? Math.min(revisitCount, 3) : 0;

    visitsByTitle.set(step.normalizedArticleTitle, [...priorVisits, graphIndex]);

    return {
      ...step,
      graphIndex,
      revisitCount,
      branchRow,
      previousVisitGraphIndex,
    };
  });
}

function nodeCenter(node: GraphNode, offsetY = 0) {
  return {
    x: SVG_PADDING_X + node.graphIndex * COLUMN_WIDTH + NODE_WIDTH / 2,
    y: SVG_PADDING_Y + node.branchRow * ROW_HEIGHT + NODE_HEIGHT / 2 + offsetY,
  };
}

export function RoutePathGraph({ steps, status }: RoutePathGraphProps) {
  const nodes = buildGraphNodes(steps);
  const maxRow = nodes.reduce((max, node) => Math.max(max, node.branchRow), 0);
  const graphWidth = Math.max(nodes.length * COLUMN_WIDTH + SVG_PADDING_X * 2, 0);
  const graphHeight = Math.max((maxRow + 1) * ROW_HEIGHT + SVG_PADDING_Y * 2 + 12, 0);
  const finalNode = nodes.at(-1);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Route Path</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Static graph of visited pages in run order.</p>
        </div>
        <Badge variant={status === "ABANDONED" ? "danger" : "success"}>
          {status === "ABANDONED" ? "Abandoned run" : "Completed run"}
        </Badge>
      </div>

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="relative" style={{ width: graphWidth, minHeight: graphHeight }}>
          <svg className="absolute inset-0" width={graphWidth} height={graphHeight} aria-hidden>
            {nodes.slice(1).map((node) => {
              const fromNode = nodes[node.graphIndex - 1];
              if (!fromNode) {
                return null;
              }

              const from = nodeCenter(fromNode);
              const to = nodeCenter(node);
              const controlX = (from.x + to.x) / 2;

              return (
                <path
                  key={`main-edge-${node.graphIndex}`}
                  d={`M ${from.x} ${from.y} C ${controlX} ${from.y}, ${controlX} ${to.y}, ${to.x} ${to.y}`}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="2"
                />
              );
            })}

            {nodes
              .filter((node) => typeof node.previousVisitGraphIndex === "number")
              .map((node) => {
                const prior = nodes[node.previousVisitGraphIndex ?? -1];
                if (!prior) {
                  return null;
                }
                const from = nodeCenter(prior, -20);
                const to = nodeCenter(node, -20);
                const controlX = (from.x + to.x) / 2;

                return (
                  <path
                    key={`revisit-edge-${node.graphIndex}`}
                    d={`M ${from.x} ${from.y} C ${controlX} ${from.y - 28}, ${controlX} ${to.y - 28}, ${to.x} ${to.y}`}
                    fill="none"
                    stroke="#8f7d66"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                );
              })}
          </svg>

          {nodes.map((node) => {
            const isFinalNode = finalNode?.graphIndex === node.graphIndex;
            const isAbandonPoint = status === "ABANDONED" && isFinalNode;

            return (
              <article
                key={`${node.graphIndex}-${node.normalizedArticleTitle}`}
                className={cn(
                  "absolute rounded-[var(--radius-md)] border bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)]",
                  "transition-colors",
                  isAbandonPoint ? "border-[#d33]/40 bg-[#fee7e6]" : "border-[var(--border)]",
                )}
                style={{
                  left: SVG_PADDING_X + node.stepIndex * COLUMN_WIDTH,
                  top: SVG_PADDING_Y + node.branchRow * ROW_HEIGHT,
                  width: NODE_WIDTH,
                  minHeight: NODE_HEIGHT,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Step {node.stepIndex}</p>
                  <p className="text-xs text-[var(--muted)]">{formatDuration(node.elapsedMs)}</p>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium text-[var(--foreground)]">{node.articleTitle}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {node.kind === "start" ? <Badge variant="neutral">Start</Badge> : null}
                  {node.kind === "target" && status !== "ABANDONED" ? <Badge variant="success">Destination</Badge> : null}
                  {node.revisitCount > 0 ? <Badge variant="purple">Revisit</Badge> : null}
                  {isAbandonPoint ? <Badge variant="danger">Abandoned here</Badge> : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
