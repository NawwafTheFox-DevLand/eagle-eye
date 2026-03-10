'use client';

import { useState } from 'react';
import { debugAuth } from '@/app/actions/debug';

export default function DebugButton() {
  const [result, setResult] = useState<any>(null);

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
      <button 
        onClick={async () => { const r = await debugAuth(); setResult(r); }}
        className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium"
      >
        Debug Auth
      </button>
      {result && (
        <pre className="mt-3 text-xs bg-white p-3 rounded overflow-auto" dir="ltr">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
