"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocation {
  toolName: string;
  state: "call" | "partial-call" | "result";
  args?: any;
  result?: any;
}

interface ToolCallDisplayProps {
  toolInvocation: ToolInvocation;
  className?: string;
}

function getToolDisplayMessage(toolInvocation: ToolInvocation): string {
  const { toolName, args, state } = toolInvocation;

  if (toolName === "str_replace_editor") {
    const command = args?.command;
    const path = args?.path;
    const filename = path ? path.split('/').pop() || path : 'file';

    switch (command) {
      case "create":
        return `Creating ${filename}`;
      case "str_replace":
        return `Editing ${filename}`;
      case "view":
        return `Viewing ${filename}`;
      case "insert":
        return `Updating ${filename}`;
      default:
        return `Working with ${filename}`;
    }
  }

  if (toolName === "file_manager") {
    const command = args?.command;
    const path = args?.path;
    const newPath = args?.new_path;
    const filename = path ? path.split('/').pop() || path : 'file';
    const newFilename = newPath ? newPath.split('/').pop() || newPath : 'file';

    switch (command) {
      case "rename":
        return `Renaming ${filename} to ${newFilename}`;
      case "delete":
        return `Deleting ${filename}`;
      default:
        return `Managing ${filename}`;
    }
  }

  // Fallback for unknown tools
  return toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function ToolCallDisplay({ toolInvocation, className = "" }: ToolCallDisplayProps) {
  const displayMessage = getToolDisplayMessage(toolInvocation);
  const isCompleted = toolInvocation.state === "result" && toolInvocation.result;

  return (
    <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200 ${className}`}>
      {isCompleted ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-neutral-700">{displayMessage}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{displayMessage}</span>
        </>
      )}
    </div>
  );
}