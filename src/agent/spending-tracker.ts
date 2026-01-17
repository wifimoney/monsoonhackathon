// ============ TYPES ============
export interface SpendingLimits {
    daily: {
        limit: number;
        spent: number;
        resetAt: number;
    };
    weekly: {
        limit: number;
        spent: number;
        resetAt: number;
    };
}

export interface SpendingState {
    limits: SpendingLimits;
    lastUpdated: number;
}

// ============ STORAGE ============
const DEFAULT_LIMITS: SpendingLimits = {
    daily: {
        limit: 500,
        spent: 0,
        resetAt: getNextDayReset(),
    },
    weekly: {
        limit: 2000,
        spent: 0,
        resetAt: getNextWeekReset(),
    },
};

let spendingState: SpendingState = {
    limits: { ...DEFAULT_LIMITS },
    lastUpdated: Date.now(),
};

function getNextDayReset(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
}

function getNextWeekReset(): number {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay()));
    nextWeek.setHours(0, 0, 0, 0);
    return nextWeek.getTime();
}

// ============ FUNCTIONS ============
export function getSpendingState(): SpendingState {
    const now = Date.now();

    // Check for daily reset
    if (now >= spendingState.limits.daily.resetAt) {
        spendingState.limits.daily.spent = 0;
        spendingState.limits.daily.resetAt = getNextDayReset();
    }

    // Check for weekly reset
    if (now >= spendingState.limits.weekly.resetAt) {
        spendingState.limits.weekly.spent = 0;
        spendingState.limits.weekly.resetAt = getNextWeekReset();
    }

    spendingState.lastUpdated = now;
    return { ...spendingState };
}

export function recordSpending(amount: number): void {
    getSpendingState(); // Ensure resets are applied
    spendingState.limits.daily.spent += amount;
    spendingState.limits.weekly.spent += amount;
    spendingState.lastUpdated = Date.now();
}

export function checkSpendingLimits(amount: number): {
    allowed: boolean;
    dailyRemaining: number;
    weeklyRemaining: number;
    issues: string[];
} {
    const state = getSpendingState();
    const dailyRemaining = state.limits.daily.limit - state.limits.daily.spent;
    const weeklyRemaining = state.limits.weekly.limit - state.limits.weekly.spent;
    const issues: string[] = [];

    if (amount > dailyRemaining) {
        issues.push(`Exceeds daily budget ($${dailyRemaining.toFixed(0)} remaining)`);
    }

    if (amount > weeklyRemaining) {
        issues.push(`Exceeds weekly budget ($${weeklyRemaining.toFixed(0)} remaining)`);
    }

    return {
        allowed: issues.length === 0,
        dailyRemaining,
        weeklyRemaining,
        issues,
    };
}

export function setSpendingLimits(daily: number, weekly: number): void {
    spendingState.limits.daily.limit = daily;
    spendingState.limits.weekly.limit = weekly;
}
