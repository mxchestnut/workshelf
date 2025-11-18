import { useState } from 'react';
import { Title } from 'react-admin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, BarChart3, Activity, Users, Flag, Lock, TrendingUp, Search } from 'lucide-react';

const TOOLS = [
  { id: 'vault', name: 'Vault', icon: Lock, url: '/vault', description: 'Secrets Management' },
  { id: 'grafana', name: 'Grafana', icon: BarChart3, url: '/grafana', description: 'Dashboards' },
  { id: 'prometheus', name: 'Prometheus', icon: Activity, url: '/prometheus', description: 'Metrics' },
  { id: 'posthog', name: 'PostHog', icon: TrendingUp, url: '/posthog', description: 'Analytics' },
  { id: 'unleash', name: 'Unleash', icon: Flag, url: '/unleash', description: 'Feature Flags' },
  { id: 'sentry', name: 'Sentry', icon: Shield, url: 'https://sentry.io', description: 'Error Tracking', external: true },
];

export function AdminTools(): JSX.Element {
  const [activeTab, setActiveTab] = useState('vault');

  return (
    <div className="p-6">
      <Title title="Admin Tools" />
      <h1 className="text-3xl font-bold mb-6">Admin Tools</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <TabsTrigger key={tool.id} value={tool.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {tool.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TOOLS.map((tool) => (
          <TabsContent key={tool.id} value={tool.id} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = tool.icon;
                    return <Icon className="h-5 w-5" />;
                  })()}
                  {tool.name}
                </CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {tool.external ? (
                  <div className="text-center py-8">
                    <p className="mb-4">This tool opens in a new window</p>
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                      Open {tool.name}
                    </a>
                  </div>
                ) : (
                  <iframe
                    src={tool.url}
                    className="w-full h-[600px] border-0 rounded"
                    title={tool.name}
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
