import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Check,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Target,
  PartyPopper,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProductivityStore } from "../../store/productivityStore";

interface GoalsListProps {
  showTitle?: boolean;
  compact?: boolean;
  maxVisible?: number;
  onGoalComplete?: (goalId: string, completed: boolean) => void;
  showAddInput?: boolean;
}

export const GoalsList: React.FC<GoalsListProps> = ({
  showTitle = true,
  compact = false,
  maxVisible,
  onGoalComplete,
  showAddInput = true,
}) => {
  const {
    todayGoals,
    loadTodayGoals,
    addGoal,
    completeGoal,
    deleteGoal,
    reorderGoals,
  } = useProductivityStore();

  const [inputText, setInputText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadTodayGoals();
  }, [loadTodayGoals]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    await addGoal(trimmed);
    setInputText("");
    setIsAdding(false);
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    completeGoal(id, !currentStatus);
    onGoalComplete?.(id, !currentStatus);
  };

  const completedCount = todayGoals.filter(
    (g) => g.isCompleted || g.completed
  ).length;
  const totalCount = todayGoals.length;
  const percent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const displayGoals =
    compact && maxVisible ? todayGoals.slice(0, maxVisible) : todayGoals;

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-3">
      {/* Title & Progress Header */}
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Daily Focus Goals
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{todayFormatted} · Intentions</p>
            </div>
          </div>

          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {completedCount}/{totalCount}
              </span>
              <span
                className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${
                  allCompleted
                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    : "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                }`}
              >
                {percent}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {totalCount > 0 && !compact && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              allCompleted
                ? "bg-emerald-500 shadow-sm shadow-emerald-500/30"
                : "bg-blue-600"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {/* All Complete Celebration Banner */}
      {allCompleted && !compact && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-emerald-50 dark:from-emerald-950/40 to-teal-50 dark:to-teal-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-medium"
        >
          <PartyPopper className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>All intentions conquered!</strong> Your Morning Score maxed out with a +20 bonus.
          </span>
        </motion.div>
      )}

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/40">
          <Sparkles className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No morning goals set for today</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Add 2–3 key intentions to give your morning a clear target
          </p>
        </div>
      )}

      {/* Goal Items List */}
      <div className={`space-y-1.5 ${compact ? "max-h-48" : "max-h-[320px]"} overflow-y-auto pr-0.5`}>
        <AnimatePresence initial={false}>
          {displayGoals.map((goal, index) => {
            const isComp = Boolean(goal.isCompleted || goal.completed);
            const goalText = goal.text || goal.goalText || goal.title || "";

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, overflow: "hidden", marginBottom: 0 }}
                transition={{ duration: 0.15 }}
                className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  isComp
                    ? "bg-slate-50/80 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800/80"
                    : "bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-500/50 shadow-xs"
                }`}
              >
                <div
                  className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
                  onClick={() => handleToggle(goal.id, isComp)}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-4.5 h-4.5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                      isComp
                        ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                        : "border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-400 bg-white dark:bg-slate-900"
                    }`}
                  >
                    {isComp && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  {/* Goal Text */}
                  <span
                    className={`text-xs font-medium truncate ${
                      isComp
                        ? "line-through text-slate-400 dark:text-slate-500"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {goalText}
                  </span>
                </div>

                {/* Right controls: Reordering and Delete (hidden in compact) */}
                {!compact && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Move Up */}
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderGoals(index, index - 1);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Move Down */}
                    {index < todayGoals.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderGoals(index, index + 1);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGoal(goal.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {compact && maxVisible && todayGoals.length > maxVisible && (
          <div className="text-center pt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            +{todayGoals.length - maxVisible} more goals
          </div>
        )}
      </div>

      {/* Add Goal Form / Button */}
      {showAddInput && (
        <div>
          {isAdding ? (
            <form onSubmit={handleAdd} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setInputText("");
                  }
                }}
                autoFocus
                placeholder="e.g., Read 15 pages, 20min workout..."
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-blue-400 dark:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setInputText("");
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors shrink-0"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full py-2 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 border border-blue-200/80 dark:border-blue-800/60 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Daily Goal</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
