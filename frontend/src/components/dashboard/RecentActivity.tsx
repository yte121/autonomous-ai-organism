import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, PackagePlus } from 'lucide-react';
import EmptyState from '@/src/components/EmptyState';
import type { Organism } from '~backend/organism/types';

interface RecentActivityProps {
  organisms: Organism[];
}

const RecentActivity = ({ organisms }: RecentActivityProps) => {
  const activeOrganisms = organisms.filter(o => o.status === 'active');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activeOrganisms.length > 0 ? (
          <div className="space-y-4">
            {activeOrganisms.slice(0, 5).map((organism) => (
              <div key={organism.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{organism.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Generation {organism.generation}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{organism.capabilities.length} capabilities</Badge>
                  <Badge className={organism.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {organism.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            Icon={PackagePlus}
            title="No Active Organisms"
            description="There are no active organisms to display. Create one to get started."
          />
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
