import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Title } from 'react-admin';
import { Shield, Users, Activity, AlertTriangle } from 'lucide-react';

export function Dashboard(): JSX.Element {
  return (
    <div className="p-6">
      <Title title="Dashboard" />
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No users yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Secure</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground">All services running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No active alerts</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to Secure Admin Platform</CardTitle>
          <CardDescription>
            A security-first, privacy-focused collaborative platform with comprehensive admin controls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Security Features</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Keycloak authentication with SSO support</li>
                <li>HashiCorp Vault for secrets management</li>
                <li>Automatic security scanning with Gitleaks and Trivy</li>
                <li>OWASP ZAP penetration testing</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Observability</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Sentry error tracking and performance monitoring</li>
                <li>OpenTelemetry distributed tracing</li>
                <li>Prometheus metrics and Grafana dashboards</li>
                <li>AWS CloudWatch logging</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Privacy & Compliance</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>WCAG 2.1 AA accessibility compliance</li>
                <li>Self-hosted analytics (PostHog)</li>
                <li>Feature flags with Unleash</li>
                <li>No unnecessary data collection</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
