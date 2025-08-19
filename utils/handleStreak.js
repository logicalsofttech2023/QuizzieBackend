const QuizStreak = require("../models/QuizStreak");
const StreakReward = require("../models/StreakReward");
const User = require("../models/user_model");

const handleStreak = async (userId, currentDateTime) => {
  const today = new Date(currentDateTime);
  today.setHours(0, 0, 0, 0);

  let streak = await QuizStreak.findOne({ userId });

  if (!streak) {
    streak = await QuizStreak.create({
      userId,
      currentStreak: 1,
      bestStreak: 1,
      lastPlayedDate: today,
      lives: 1,
      lifeLastGiven: currentDateTime,
    });
    return { streak, reward: null };
  }

  const now = new Date(currentDateTime);
  const monthDiff =
    (now.getFullYear() - streak.lifeLastGiven.getFullYear()) * 12 +
    (now.getMonth() - streak.lifeLastGiven.getMonth());
  if (monthDiff >= 1) {
    streak.lives += 1;
    streak.lifeLastGiven = now;
  }

  const lastDate = new Date(streak.lastPlayedDate);
  const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { streak, reward: null };
  }

  if (diffDays === 1) {
    streak.currentStreak++;
  } else {
    if (
      streak.lives > 0 &&
      (!streak.countdownEndTime || streak.countdownEndTime >= now)
    ) {
      streak.lives--;
    } else {
      streak.currentStreak = 1;
    }
  }

  if (streak.currentStreak > streak.bestStreak) {
    streak.bestStreak = streak.currentStreak;
  }

  let reward = null;
  const rewardData = await StreakReward.findOne({
    streakDay: streak.currentStreak,
  });

  if (
    rewardData &&
    !streak.rewardsHistory.find((r) => r.streakDay === streak.currentStreak)
  ) {
    reward = rewardData.rewardAmount;
    streak.rewardsHistory.push({
      streakDay: streak.currentStreak,
      rewardAmount: reward,
    });

    const user = await User.findById(userId);
    if (user) {
      user.wallet = (parseFloat(user.wallet) + reward).toFixed(2);
      await user.save();
    }
  }

  streak.lastPlayedDate = today;
  await streak.save();

  return { streak, reward };
};

module.exports = handleStreak;
