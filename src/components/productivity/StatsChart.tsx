import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { useProductivityStore } from "../../store/productivityStore";

export const StatsChart: React.FC = () => {
  const { weeklyStats } = useProductivityStore();

  // 7-day data for wake times and snoozes
  const wakeTimeData = [
    { day: "Mon", wakeHour: 6.0, timeStr: "06:00 AM", diffStr: "On time" },
    { day: "Tue", wakeHour: 6.15, timeStr: "06:09 AM", diffStr: "9 min late" },
    { day: "Wed", wakeHour: 5.95, timeStr: "05:57 AM", diffStr: "3 min early" },
    { day: "Thu", wakeHour: 6.0, timeStr: "06:00 AM", diffStr: "On time" },
    { day: "Fri", wakeHour: 6.2, timeStr: "06:12 AM", diffStr: "12 min late" },
    { day: "Sat", wakeHour: 7.5, timeStr: "07:30 AM", diffStr: "Weekend pace" },
    { day: "Sun", wakeHour: 7.0, timeStr: "07:00 AM", diffStr: "Weekend pace" },
  ];

  const snoozeData = [
    { day: "Mon", snoozes: 0 },
    { day: "Tue", snoozes: 1 },
    { day: "Wed", snoozes: 0 },
    { day: "Thu", snoozes: 0 },
    { day: "Fri", snoozes: 1 },
    { day: "Sat", snoozes: 0 },
    { day: "Sun", snoozes: 0 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Chart A: Weekly Wake Time */}
      <div className="p-5 bg-white/80 rounded-2xl border border-blue-100/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              Weekly Wake Times
            </h4>
            <p className="text-xs text-slate-400">
              Actual wake moments vs 6:00 AM target
            </p>
          </div>
          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
            Avg: {weeklyStats?.averageWakeTime || "06:14 AM"}
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={wakeTimeData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#CBD5E1" }}
                tickLine={false}
              />
              <YAxis
                domain={[5, 9]}
                ticks={[5, 6, 7, 8, 9]}
                tickFormatter={(v) => `${v}:00`}
                tick={{ fontSize: 10, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg text-xs border border-slate-700">
                        <p className="font-bold text-slate-200">{data.day}</p>
                        <p className="text-blue-300 font-semibold text-sm">
                          Woke at {data.timeStr}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {data.diffStr}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={6.0}
                stroke="#EF4444"
                strokeDasharray="4 4"
                label={{
                  value: "Target 6:00",
                  fill: "#EF4444",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              <Bar
                dataKey="wakeHour"
                fill="#2563EB"
                radius={[6, 6, 0, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart B: Snooze Frequency */}
      <div className="p-5 bg-white/80 rounded-2xl border border-blue-100/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              Snooze Frequency
            </h4>
            <p className="text-xs text-slate-400">
              Discipline resistance across the past 7 days
            </p>
          </div>
          <span className="text-[11px] font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">
            Total: {weeklyStats?.totalSnoozes ?? 2} snoozes
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={snoozeData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="snoozeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#CBD5E1" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 4]}
                ticks={[0, 1, 2, 3]}
                tick={{ fontSize: 10, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg text-xs border border-slate-700">
                        <p className="font-bold text-slate-200">{data.day}</p>
                        <p className="text-sky-300 font-semibold text-sm">
                          {data.snoozes === 0
                            ? "Zero snoozes! (Disciplined)"
                            : `Snoozed ${data.snoozes}×`}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="snoozes"
                stroke="#0EA5E9"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#snoozeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
