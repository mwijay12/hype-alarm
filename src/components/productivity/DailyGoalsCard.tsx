import React from "react";
import { GoalsList } from "./GoalsList";
import { Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { GlassCard } from "../ui/GlassCard";

interface DailyGoalsCardProps {
  compact?: boolean;
  maxVisible?: number;
  onGoalComplete?: (id: string, completed: boolean) => void;
  showAddInput?: boolean;
  showViewAllLink?: boolean;
}

export const DailyGoalsCard: React.FC<DailyGoalsCardProps> = ({
  compact = true,
  maxVisible = 3,
  onGoalComplete,
  showAddInput = true,
  showViewAllLink = true,
}) => {
  return (
    <GlassCard className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Today's Focus Intentions</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Goals to accomplish upon waking</p>
          </div>
        </div>

        {showViewAllLink && (
          <Link
            to="/progress"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <span>Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <GoalsList
        showTitle={false}
        compact={compact}
        maxVisible={maxVisible}
        onGoalComplete={onGoalComplete}
        showAddInput={showAddInput}
      />
    </GlassCard>
  );
};
