export class DateUtil {
  /**
   * 添加天数到日期
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * 计算两个日期之间的天数差
   */
  static daysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
  }

  /**
   * 检查日期是否已过期
   */
  static isExpired(date: Date): boolean {
    return new Date() > date;
  }

  /**
   * 获取剩余天数
   */
  static getRemainingDays(expiryDate: Date): number {
    if (this.isExpired(expiryDate)) {
      return 0;
    }
    return this.daysBetween(new Date(), expiryDate);
  }
}
