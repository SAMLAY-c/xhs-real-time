import React, { useEffect, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Image, Eye, ExternalLink } from 'lucide-react';
import { useCrawlerStore } from '@/store/useCrawlerStore';
import { CrawlPost } from '@/types';
import { formatNumber, formatTimestamp, truncateText } from '@/lib/utils';

export function RealtimeTable() {
  const { posts, autoScroll } = useCrawlerStore();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'liked_count', desc: true }]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new posts arrive
  useEffect(() => {
    if (autoScroll && tableContainerRef.current) {
      const container = tableContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [posts, autoScroll]);

  const toggleRowExpansion = (noteId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const columns: ColumnDef<CrawlPost>[] = [
    {
      accessorKey: 'image_list',
      header: '封面',
      cell: ({ row }) => {
        const post = row.original;
        // Handle both string and array types for image_list
        const imageList = post.image_list ?
          (typeof post.image_list === 'string' ? post.image_list.split(',') : post.image_list) : [];
        const firstImage = imageList[0];

        return (
          <div className="w-16 h-16 relative group cursor-pointer" onClick={() => toggleRowExpansion(post.note_id)}>
            {firstImage ? (
              <img
                src={firstImage}
                alt={post.title}
                className="w-full h-full object-cover rounded-md"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                <Image className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          标题
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="w-4 h-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="w-4 h-4" />
          ) : (
            <ArrowUpDown className="w-4 h-4" />
          )}
        </button>
      ),
      cell: ({ row }) => {
        const post = row.original;
        return (
          <div className="max-w-md">
            <a
              href={post.note_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
            >
              {truncateText(post.title || '无标题', 50)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        );
      },
    },
    {
      accessorKey: 'nickname',
      header: '作者',
      cell: ({ row }) => {
        const post = row.original;
        return (
          <div className="flex items-center gap-2">
            {post.avatar && (
              <img
                src={post.avatar}
                alt={post.nickname}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <span className="font-medium">{post.nickname}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'liked_count',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          点赞数
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="w-4 h-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="w-4 h-4" />
          ) : (
            <ArrowUpDown className="w-4 h-4" />
          )}
        </button>
      ),
      cell: ({ row }) => {
        const post = row.original;
        return (
          <div className="text-right">
            <span className="font-medium text-red-600">
              {formatNumber(post.liked_count)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'collected_count',
      header: '收藏数',
      cell: ({ row }) => {
        const post = row.original;
        return (
          <div className="text-right">
            <span className="font-medium text-orange-600">
              {formatNumber(post.collected_count || '0')}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'time',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          发布时间
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="w-4 h-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="w-4 h-4" />
          ) : (
            <ArrowUpDown className="w-4 h-4" />
          )}
        </button>
      ),
      cell: ({ row }) => {
        const post = row.original;
        return (
          <span className="text-sm text-muted-foreground">
            {formatTimestamp(post.time)}
          </span>
        );
      },
    },
    {
      accessorKey: 'ip_location',
      header: 'IP属地',
      cell: ({ row }) => {
        const post = row.original;
        if (!post.ip_location) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="px-2 py-1 bg-muted rounded-md text-sm">
            {post.ip_location}
          </span>
        );
      },
    },
  ];

  const table = useReactTable({
    data: posts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="bg-card rounded-lg border shadow-sm h-full flex flex-col">
      {/* Table Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/20">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>实时数据流</span>
          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-sm font-mono">
            {posts.length} 条
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={() => {
                const store = useCrawlerStore.getState();
                store.toggleAutoScroll();
              }}
              className="rounded border-input"
            />
            <span>自动滚动</span>
          </label>
        </div>
      </div>

      {/* Table Container */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <table className="w-full">
          <thead className="sticky top-0 bg-background z-10 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-left font-medium text-xs bg-muted/50 text-muted-foreground uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr className="hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {expandedRows.has(row.original.note_id) && (
                  <tr className="bg-muted/10">
                    <td colSpan={columns.length} className="px-3 py-2">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground">原始数据 (JSON)</h4>
                        <pre className="text-xs bg-muted/30 p-3 rounded-md overflow-x-auto max-h-40 font-mono">
                          {JSON.stringify(row.original, null, 2)}
                        </pre>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {posts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Eye className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium">暂无数据</p>
            <p className="text-sm mt-1">请先启动爬虫开始采集</p>
          </div>
        )}
      </div>
    </div>
  );
}
