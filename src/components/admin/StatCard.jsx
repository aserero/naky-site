import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function StatCard({ title, value, icon: Icon, colorClass }) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClass} text-white`}>
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );
}