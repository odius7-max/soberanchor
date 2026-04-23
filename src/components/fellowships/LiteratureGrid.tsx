'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { FellowshipBook } from '@/data/fellowship-content';

interface LiteratureGridProps {
  books: FellowshipBook[];
}

export default function LiteratureGrid({ books }: LiteratureGridProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {books.map((book) => {
        const showImage = book.coverImage && !failedImages.has(book.title);
        return (
          <a
            key={book.title}
            href={book.externalUrl ?? '#'}
            target={book.externalUrl ? '_blank' : undefined}
            rel={book.externalUrl ? 'noopener noreferrer' : undefined}
            className="flex gap-4 p-4 rounded-xl border hover:border-teal transition bg-white"
          >
            <div className="flex-shrink-0 w-[72px] h-[108px] rounded-md overflow-hidden bg-warm-gray flex items-center justify-center">
              {showImage ? (
                <Image
                  src={book.coverImage!}
                  alt={`${book.title} cover`}
                  width={72}
                  height={108}
                  className="object-cover w-full h-full"
                  onError={() =>
                    setFailedImages((prev) => new Set(prev).add(book.title))
                  }
                />
              ) : (
                <span className="text-[10px] uppercase tracking-wide text-mid text-center px-2 font-bold">
                  {book.title.split(' ').slice(0, 3).join(' ')}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-navy leading-tight mb-1">
                {book.title}
              </div>
              {book.year && (
                <div className="text-xs text-mid mb-2">{book.year}</div>
              )}
              <div className="text-[13px] text-dark leading-relaxed">
                {book.description}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
