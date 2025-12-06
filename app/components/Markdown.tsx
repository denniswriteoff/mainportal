"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownProps = {
  children: string;
  className?: string;
};

export default function Markdown({ children, className }: MarkdownProps) {
  const components: Components = {
    a: ({ node, ...props }) => (
      <a {...props} className="underline hover:opacity-80" target="_blank" rel="noopener noreferrer" />
    ),
    code: ({ inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code className={`px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10 ${className || ''}`} {...props}>
            {children}
          </code>
        );
      }
      return (
        <pre className="p-3 rounded-md bg-gray-100 dark:bg-white/10 overflow-x-auto text-[13px]">
          <code className={className} {...props}>{children}</code>
        </pre>
      );
    },
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto wide-content-scroll -mx-2 px-2">
        <table className="min-w-full text-left border-collapse text-sm" {...props} />
      </div>
    ),
    th: ({ node, ...props }) => (
      <th className="border-b border-gray-200 dark:border-white/10 px-2 py-1 font-medium" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className="border-b border-gray-100 dark:border-white/5 px-2 py-1 align-top" {...props} />
    ),
    ul: ({ node, ...props }) => (
      <ul className="list-disc pl-6 space-y-1" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal pl-6 space-y-1" {...props} />
    ),
    p: ({ node, ...props }) => <p className="mb-2" {...props} />,
  };
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}



