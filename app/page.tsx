import React from "react";
import { DashboardShell } from "@/components/layout/shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  AreaChartWidget, 
  BarChartWidget, 
  PieChartWidget 
} from "@/components/charts/widgets";
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
  Activity 
} from "lucide-react";

export default function Dashboard() {
  const stats = [
    { name: "Total Users", value: "2,400", change: "+12.2%", icon: Users },
    { name: "Active Sessions", value: "540", change: "+5.4%", icon: Activity },
    { name: "Sales Revenue", value: "$12,450", change: "+18.1%", icon: DollarSign },
    { name: "Conversions", value: "12%", change: "+2.3%", icon: ShoppingBag },
  ];

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BlurAdmin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time analytics and enterprise performance overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.name} className="flex items-center space-x-4">
                <div className="p-3 bg-primary/10 text-primary rounded-full">
                  <Icon size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold">{stat.value}</span>
                    <span className="text-xs font-semibold text-green-500">{stat.change}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Regional Sales Traffic</CardTitle>
            </CardHeader>
            <CardContent>
              <AreaChartWidget />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Conversion Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartWidget />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Market Segments</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartWidget />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Enterprise Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { user: "User #1042", action: "Updated security credentials", time: "2 minutes ago" },
                  { user: "User #8931", action: "Configured amCharts custom viewport", time: "10 minutes ago" },
                  { user: "User #0492", action: "Created PostgreSQL data migration route", time: "45 minutes ago" },
                  { user: "User #3019", action: "Integrated iron-session middlewares", time: "1 hour ago" },
                ].map((act, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-sm">{act.user}</p>
                      <p className="text-xs text-muted-foreground">{act.action}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{act.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}