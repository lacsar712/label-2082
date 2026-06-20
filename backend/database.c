#include "database.h"
#include "logger.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

User users[MAX_USERS];
int user_count = 0;
Order orders[MAX_ORDERS];
int order_count = 0;
int next_id = 1;
LostFound lostfound_list[MAX_LOSTFOUND];
int lostfound_count = 0;
int lostfound_next_id = 1;
Notification notifications[MAX_NOTIFICATIONS];
int notification_count = 0;
int notification_next_id = 1;
Feedback feedbacks[MAX_FEEDBACK];
int feedback_count = 0;
int feedback_next_id = 1;
WalletTransaction wallet_txns[MAX_WALLET_TXNS];
int wallet_txn_count = 0;
int wallet_txn_next_id = 1;
TaskTemplate templates[MAX_TEMPLATES];
int template_count = 0;
int template_next_id = 1;
Report reports[MAX_REPORTS];
int report_count = 0;
int report_next_id = 1;
Badge badges[MAX_BADGES];
int badge_count = 0;
int badge_next_id = 1;
ShareCode share_codes[MAX_SHARE_CODES];
int share_code_count = 0;
int share_code_next_id = 1;

const char* get_user_real_name(const char *username) {
  for (int i = 0; i < user_count; i++) {
    if (strcmp(users[i].username, username) == 0) {
      return users[i].real_name;
    }
  }
  return username;
}

void create_notification(const char *username, const char *type, const char *title, const char *summary, const char *related_id) {
  if (notification_count >= MAX_NOTIFICATIONS) {
    log_message(LOG_WARN, "Notification limit reached, cannot create more");
    return;
  }
  if (!username || strlen(username) == 0) return;

  Notification *n = &notifications[notification_count++];
  n->id = notification_next_id++;
  strncpy(n->username, username, sizeof(n->username) - 1);
  strncpy(n->type, type ? type : "system", sizeof(n->type) - 1);
  strncpy(n->title, title ? title : "系统通知", sizeof(n->title) - 1);
  strncpy(n->summary, summary ? summary : "", sizeof(n->summary) - 1);
  strncpy(n->related_id, related_id ? related_id : "", sizeof(n->related_id) - 1);
  n->is_read = 0;

  time_t t = time(NULL);
  struct tm *tm_info = localtime(&t);
  strftime(n->created_at, sizeof(n->created_at), "%Y-%m-%d %H:%M:%S", tm_info);

  save_data();
  log_message(LOG_INFO, "Notification created for user %s: %s", username, n->title);
}

double get_user_balance(const char *username) {
  for (int i = 0; i < user_count; i++) {
    if (strcmp(users[i].username, username) == 0) {
      return users[i].balance;
    }
  }
  return 0.0;
}

int add_wallet_transaction(const char *username, const char *type, double amount,
                            const char *description, const char *order_id,
                            const char *remark) {
  if (wallet_txn_count >= MAX_WALLET_TXNS) {
    log_message(LOG_WARN, "Wallet transaction limit reached");
    return -1;
  }
  if (!username || strlen(username) == 0 || amount <= 0) {
    return -1;
  }

  int user_idx = -1;
  for (int i = 0; i < user_count; i++) {
    if (strcmp(users[i].username, username) == 0) {
      user_idx = i;
      break;
    }
  }
  if (user_idx == -1) {
    log_message(LOG_WARN, "User not found for wallet transaction: %s", username);
    return -1;
  }

  if (strcmp(type, "expense") == 0) {
    if (users[user_idx].balance < amount) {
      log_message(LOG_WARN, "Insufficient balance for user %s", username);
      return -2;
    }
    users[user_idx].balance -= amount;
  } else if (strcmp(type, "income") == 0) {
    users[user_idx].balance += amount;
  } else {
    return -1;
  }

  WalletTransaction *txn = &wallet_txns[wallet_txn_count++];
  txn->id = wallet_txn_next_id++;
  strncpy(txn->username, username, sizeof(txn->username) - 1);
  strncpy(txn->type, type, sizeof(txn->type) - 1);
  txn->amount = amount;
  strncpy(txn->description, description ? description : "", sizeof(txn->description) - 1);
  strncpy(txn->order_id, order_id ? order_id : "", sizeof(txn->order_id) - 1);
  strncpy(txn->remark, remark ? remark : "", sizeof(txn->remark) - 1);

  time_t t = time(NULL);
  struct tm *tm_info = localtime(&t);
  strftime(txn->created_at, sizeof(txn->created_at), "%Y-%m-%d %H:%M:%S", tm_info);

  save_data();
  log_message(LOG_INFO, "Wallet transaction created: user=%s type=%s amount=%.2f",
              username, type, amount);
  return txn->id;
}

int record_wallet_transaction(const char *username, const char *type, double amount,
                               const char *description, const char *order_id,
                               const char *remark) {
  if (wallet_txn_count >= MAX_WALLET_TXNS) {
    log_message(LOG_WARN, "Wallet transaction limit reached");
    return -1;
  }
  if (!username || strlen(username) == 0 || amount <= 0) {
    return -1;
  }

  WalletTransaction *txn = &wallet_txns[wallet_txn_count++];
  txn->id = wallet_txn_next_id++;
  strncpy(txn->username, username, sizeof(txn->username) - 1);
  strncpy(txn->type, type, sizeof(txn->type) - 1);
  txn->amount = amount;
  strncpy(txn->description, description ? description : "", sizeof(txn->description) - 1);
  strncpy(txn->order_id, order_id ? order_id : "", sizeof(txn->order_id) - 1);
  strncpy(txn->remark, remark ? remark : "", sizeof(txn->remark) - 1);

  time_t t = time(NULL);
  struct tm *tm_info = localtime(&t);
  strftime(txn->created_at, sizeof(txn->created_at), "%Y-%m-%d %H:%M:%S", tm_info);

  save_data();
  log_message(LOG_INFO, "Wallet transaction recorded (no balance change): user=%s type=%s amount=%.2f",
              username, type, amount);
  return txn->id;
}

static void escape_wallet_json(char *dst, const char *src, int max_len) {
  int j = 0;
  for (int i = 0; src[i] && j < max_len - 1; i++) {
    if (src[i] == '"') {
      dst[j++] = '\\';
      dst[j++] = '"';
    } else if (src[i] == '\\') {
      dst[j++] = '\\';
      dst[j++] = '\\';
    } else if (src[i] == '\n') {
      dst[j++] = '\\';
      dst[j++] = 'n';
    } else if (src[i] == '\r') {
      dst[j++] = '\\';
      dst[j++] = 'r';
    } else {
      dst[j++] = src[i];
    }
  }
  dst[j] = '\0';
}

void get_wallet_txns_json(char *json, const char *username, const char *type_filter, const char *month) {
  strcat(json, "[");
  int first = 1;

  for (int i = wallet_txn_count - 1; i >= 0; i--) {
    if (username && strlen(username) > 0 &&
        strcmp(wallet_txns[i].username, username) != 0)
      continue;

    if (type_filter && strlen(type_filter) > 0 &&
        strcmp(type_filter, "all") != 0 &&
        strcmp(wallet_txns[i].type, type_filter) != 0)
      continue;

    if (month && strlen(month) > 0 && strncmp(wallet_txns[i].created_at, month, 7) != 0)
      continue;

    if (!first)
      strcat(json, ",");

    char esc_desc[400], esc_remark[200], esc_order[40];
    escape_wallet_json(esc_desc, wallet_txns[i].description, sizeof(esc_desc));
    escape_wallet_json(esc_remark, wallet_txns[i].remark, sizeof(esc_remark));
    escape_wallet_json(esc_order, wallet_txns[i].order_id, sizeof(esc_order));

    char item[1024];
    sprintf(item,
            "{\"id\":%d,\"type\":\"%s\",\"amount\":%.2f,"
            "\"description\":\"%s\",\"orderId\":\"%s\","
            "\"remark\":\"%s\",\"createdAt\":\"%s\"}",
            wallet_txns[i].id, wallet_txns[i].type, wallet_txns[i].amount,
            esc_desc, esc_order, esc_remark, wallet_txns[i].created_at);
    strcat(json, item);
    first = 0;
  }
  strcat(json, "]");
}

void get_wallet_summary_json(char *json, const char *username) {
  double balance = 0.0;
  double total_income = 0.0;
  double total_expense = 0.0;
  double month_income = 0.0;
  double month_expense = 0.0;

  for (int i = 0; i < user_count; i++) {
    if (strcmp(users[i].username, username) == 0) {
      balance = users[i].balance;
      break;
    }
  }

  time_t t = time(NULL);
  struct tm *tm_info = localtime(&t);
  char current_month[8];
  strftime(current_month, sizeof(current_month), "%Y-%m", tm_info);

  for (int i = 0; i < wallet_txn_count; i++) {
    if (strcmp(wallet_txns[i].username, username) != 0)
      continue;

    if (strcmp(wallet_txns[i].type, "income") == 0) {
      total_income += wallet_txns[i].amount;
      if (strncmp(wallet_txns[i].created_at, current_month, 7) == 0) {
        month_income += wallet_txns[i].amount;
      }
    } else if (strcmp(wallet_txns[i].type, "expense") == 0) {
      total_expense += wallet_txns[i].amount;
      if (strncmp(wallet_txns[i].created_at, current_month, 7) == 0) {
        month_expense += wallet_txns[i].amount;
      }
    }
  }

  sprintf(json,
          "{\"balance\":%.2f,\"totalIncome\":%.2f,\"totalExpense\":%.2f,"
          "\"monthIncome\":%.2f,\"monthExpense\":%.2f,\"currentMonth\":\"%s\"}",
          balance, total_income, total_expense,
          month_income, month_expense, current_month);
}

static void escape_feedback_json(char *dst, const char *src, int max_len) {
  int j = 0;
  for (int i = 0; src[i] && j < max_len - 1; i++) {
    if (src[i] == '"') {
      dst[j++] = '\\';
      dst[j++] = '"';
    } else if (src[i] == '\\') {
      dst[j++] = '\\';
      dst[j++] = '\\';
    } else if (src[i] == '\n') {
      dst[j++] = '\\';
      dst[j++] = 'n';
    } else if (src[i] == '\r') {
      dst[j++] = '\\';
      dst[j++] = 'r';
    } else if (src[i] == '\t') {
      dst[j++] = '\\';
      dst[j++] = 't';
    } else {
      dst[j++] = src[i];
    }
  }
  dst[j] = '\0';
}

static void generate_auto_reply(Feedback *fb) {
  const char *reply_acc =
      "你好！感谢你的反馈。关于账号问题，请尝试以下步骤：\n"
      "1. 确认账号是否正确注册过\n"
      "2. 检查密码大小写是否正确\n"
      "3. 如仍无法登录，可点击登录页的\"忘记密码\"重置\n"
      "如需进一步帮助，请提供你的注册手机号。";
  const char *reply_task =
      "你好！感谢你的反馈。关于任务发布问题：\n"
      "1. 发布任务需先完成实名认证\n"
      "2. 取件地址和送达地址请填写详细\n"
      "3. 任务发布后2小时内无人接单可免费取消\n"
      "如有其他疑问请随时联系我们。";
  const char *reply_delivery =
      "你好！感谢你的反馈。关于接单配送问题：\n"
      "1. 接单后请尽快联系发件人确认取件时间\n"
      "2. 如遇联系不到发件人的情况，可在订单详情页点击\"联系客服\"\n"
      "3. 配送完成请及时上传取件码完成确认\n"
      "感谢你的理解与支持！";
  const char *reply_payment =
      "你好！感谢你的反馈。关于报酬结算问题：\n"
      "1. 订单完成后报酬自动转入账户余额\n"
      "2. 满10元可提现到微信或支付宝，提现24小时内到账\n"
      "3. 每日提现上限为200元\n"
      "如有疑问请提供订单号以便查询。";
  const char *reply_security =
      "你好！感谢你的反馈。关于账户安全问题：\n"
      "1. 建议定期修改密码，密码包含字母数字和符号\n"
      "2. 不要在公共设备上勾选\"记住密码\"\n"
      "3. 如发现账号异常，请立即联系客服冻结账号\n"
      "我们会全力保障你的账户安全。";
  const char *reply_suggestion =
      "你好！非常感谢你的宝贵建议！\n"
      "我们已将你的建议记录并反馈给产品团队评估。\n"
      "如果建议被采纳，我们会通过站内信通知你，并赠送信用分奖励。\n"
      "再次感谢你对校递快跑的支持！";
  const char *reply_general =
      "你好！感谢你的反馈，我们已收到并开始处理。\n"
      "一般问题会在24小时内回复，紧急问题请直接联系客服电话：400-XXX-XXXX。\n"
      "感谢你对校递快跑的支持与理解！";

  const char *reply_text = reply_general;
  const char *cat = fb->category;

  if (strcmp(cat, "账号注册") == 0 || strcmp(cat, "账户安全") == 0) {
    reply_text = (strcmp(cat, "账号注册") == 0) ? reply_acc : reply_security;
  } else if (strcmp(cat, "任务发布") == 0) {
    reply_text = reply_task;
  } else if (strcmp(cat, "接单配送") == 0) {
    reply_text = reply_delivery;
  } else if (strcmp(cat, "报酬结算") == 0) {
    reply_text = reply_payment;
  } else if (strcmp(cat, "意见建议") == 0) {
    reply_text = reply_suggestion;
  }

  strncpy(fb->reply, reply_text, sizeof(fb->reply) - 1);
  fb->reply[sizeof(fb->reply) - 1] = '\0';

  time_t t = time(NULL);
  struct tm *tm_info = localtime(&t);
  t += 30 * 60;
  tm_info = localtime(&t);
  strftime(fb->reply_at, sizeof(fb->reply_at), "%Y-%m-%d %H:%M:%S", tm_info);

  strcpy(fb->status, "replied");
}

static void simulate_auto_replies() {
  int changed = 0;
  for (int i = 0; i < feedback_count; i++) {
    if (strcmp(feedbacks[i].status, "pending") == 0) {
      if (feedbacks[i].id <= 5 || feedbacks[i].id % 2 == 0) {
        generate_auto_reply(&feedbacks[i]);
        changed = 1;
      }
    }
  }
  if (changed) {
    save_data();
  }
}

void get_feedbacks_json(char *json, const char *username) {
  simulate_auto_replies();

  strcat(json, "[");
  int first = 1;

  for (int i = feedback_count - 1; i >= 0; i--) {
    if (username && strlen(username) > 0 &&
        strcmp(feedbacks[i].username, username) != 0)
      continue;

    if (!first)
      strcat(json, ",");

    char esc_title[200], esc_desc[2000], esc_category[100];
    char esc_reply[2000];
    escape_feedback_json(esc_title, feedbacks[i].title, sizeof(esc_title));
    escape_feedback_json(esc_desc, feedbacks[i].description, sizeof(esc_desc));
    escape_feedback_json(esc_category, feedbacks[i].category,
                         sizeof(esc_category));
    escape_feedback_json(esc_reply, feedbacks[i].reply, sizeof(esc_reply));

    char item[4096];
    sprintf(item,
            "{\"id\":%d,\"username\":\"%s\",\"category\":\"%s\","
            "\"title\":\"%s\",\"description\":\"%s\",\"status\":\"%s\","
            "\"createdAt\":\"%s\",\"reply\":\"%s\",\"replyAt\":\"%s\"}",
            feedbacks[i].id, feedbacks[i].username, esc_category,
            esc_title, esc_desc, feedbacks[i].status,
            feedbacks[i].created_at,
            strlen(feedbacks[i].reply) > 0 ? esc_reply : "",
            strlen(feedbacks[i].reply) > 0 ? feedbacks[i].reply_at : "");
    strcat(json, item);
    first = 0;
  }
  strcat(json, "]");
}

void save_data() {
  FILE *f1 = fopen("data_orders.bin", "wb");
  if (f1) {
    fwrite(&order_count, sizeof(int), 1, f1);
    fwrite(&next_id, sizeof(int), 1, f1);
    fwrite(orders, sizeof(Order), order_count, f1);
    fclose(f1);
    log_message(LOG_INFO, "Orders data saved successfully");
  } else {
    log_message(LOG_ERROR, "Failed to save orders data");
  }

  FILE *f2 = fopen("data_users.bin", "wb");
  if (f2) {
    fwrite(&user_count, sizeof(int), 1, f2);
    fwrite(users, sizeof(User), user_count, f2);
    fclose(f2);
    log_message(LOG_INFO, "Users data saved successfully");
  } else {
    log_message(LOG_ERROR, "Failed to save users data");
  }

  FILE *f3 = fopen("data_lostfound.bin", "wb");
  if (f3) {
    fwrite(&lostfound_count, sizeof(int), 1, f3);
    fwrite(&lostfound_next_id, sizeof(int), 1, f3);
    fwrite(lostfound_list, sizeof(LostFound), lostfound_count, f3);
    fclose(f3);
    log_message(LOG_INFO, "LostFound data saved successfully");
  } else {
    log_message(LOG_ERROR, "Failed to save lostfound data");
  }

  FILE *f4 = fopen("data_notifications.bin", "wb");
  if (f4) {
    fwrite(&notification_count, sizeof(int), 1, f4);
    fwrite(&notification_next_id, sizeof(int), 1, f4);
    fwrite(notifications, sizeof(Notification), notification_count, f4);
    fclose(f4);
    log_message(LOG_INFO, "Notifications data saved successfully");
  } else {
    log_message(LOG_ERROR, "Failed to save notifications data");
  }

  FILE *f5 = fopen("data_feedbacks.bin", "wb");
  if (f5) {
    fwrite(&feedback_count, sizeof(int), 1, f5);
    fwrite(&feedback_next_id, sizeof(int), 1, f5);
    fwrite(feedbacks, sizeof(Feedback), feedback_count, f5);
    fclose(f5);
    log_message(LOG_INFO, "Feedbacks data saved successfully");
  } else {
    log_message(LOG_ERROR, "Failed to save feedbacks data");
  }

  FILE *f6 = fopen("data_wallet.bin", "wb");
  if (f6) {
    fwrite(&wallet_txn_count, sizeof(int), 1, f6);
    fwrite(&wallet_txn_next_id, sizeof(int), 1, f6);
    fwrite(wallet_txns, sizeof(WalletTransaction), wallet_txn_count, f6);
    fclose(f6);
    log_message(LOG_INFO, "Wallet data saved successfully");
  } else {
    log_message(LOG_ERROR, "Failed to save wallet data");
  }

  FILE *f7 = fopen("data_templates.bin", "wb");
  if (f7) {
    fwrite(&template_count, sizeof(int), 1, f7);
    fwrite(&template_next_id, sizeof(int), 1, f7);
    fwrite(templates, sizeof(TaskTemplate), template_count, f7);
    fclose(f7);
    log_message(LOG_INFO, "Templates data saved successfully");
  } else {
    log_message(LOG_ERROR, "Failed to save templates data");
  }

  FILE *f8 = fopen("data_reports.bin", "wb");
  if (f8) {
    fwrite(&report_count, sizeof(int), 1, f8);
    fwrite(&report_next_id, sizeof(int), 1, f8);
    fwrite(reports, sizeof(Report), report_count, f8);
    fclose(f8);
    log_message(LOG_INFO, "Reports data saved successfully");
  } else {
    log_message(LOG_ERROR, "Failed to save reports data");
  }

  FILE *f9 = fopen("data_badges.bin", "wb");
  if (f9) {
    fwrite(&badge_count, sizeof(int), 1, f9);
    fwrite(&badge_next_id, sizeof(int), 1, f9);
    fwrite(badges, sizeof(Badge), badge_count, f9);
    fclose(f9);
    log_message(LOG_INFO, "Badges data saved successfully");
  } else {
    log_message(LOG_ERROR, "Failed to save badges data");
  }

  FILE *f10 = fopen("data_share_codes.bin", "wb");
  if (f10) {
    fwrite(&share_code_count, sizeof(int), 1, f10);
    fwrite(&share_code_next_id, sizeof(int), 1, f10);
    fwrite(share_codes, sizeof(ShareCode), share_code_count, f10);
    fclose(f10);
    log_message(LOG_INFO, "Share codes data saved successfully");
  } else {
    log_message(LOG_ERROR, "Failed to save share codes data");
  }
}

static void backfill_order_data() {
  int need_save = 0;
  for (int i = 0; i < order_count; i++) {
    if (strlen(orders[i].created_at) == 0) {
      int days_ago = rand() % 60;
      int hours_ago = rand() % 24;
      time_t t = time(NULL) - days_ago * 86400 - hours_ago * 3600;
      struct tm *tm_info = localtime(&t);
      strftime(orders[i].created_at, sizeof(orders[i].created_at),
               "%Y-%m-%d %H:%M:%S", tm_info);
      need_save = 1;
    }
    if (orders[i].rating == 0 &&
        strcmp(orders[i].status, "completed") == 0) {
      orders[i].rating = (rand() % 2) + 4;
      need_save = 1;
    }
  }
  if (need_save) {
    save_data();
    log_message(LOG_INFO, "Backfilled order timestamps and ratings");
  }
}

static void seed_lostfound_demo_data() {
  if (lostfound_count > 0) return;

  const char *types[] = {"lost", "found"};
  const char *titles[] = {
      "图书馆三楼遗失黑色双肩包", "食堂拾到校园卡一张",
      "教学楼B区丢失蓝色雨伞", "快递柜发现未取走的快递盒",
      "操场丢失白色AirPods", "南门保安室收到一串钥匙",
      "宿舍楼下捡到粉色水杯", "丢失机械手表一块",
      "菜鸟驿站拾到眼镜一副", "计算机楼丢失笔记本电脑"
  };
  const char *descs[] = {
      "黑色Nike双肩包，内有《算法导论》和一本笔记本，对本人非常重要，有拾到者必有重谢！",
      "校园卡尾号3721，姓名张同学，请失主联系认领。",
      "天堂牌蓝色长柄雨伞，伞柄有小猫咪贴纸。",
      "中通快递，收件人李同学，可能被误拿。",
      "白色AirPods Pro，充电盒有刻字，请好心人联系！",
      "共5把钥匙，含一个汽车遥控器钥匙，已放保安室。",
      "膳魔师粉色保温杯，杯身有贴纸装饰。",
      "天梭机械手表，银色表带，有纪念意义。",
      "黑色方框近视眼镜，500度左右，镜框品牌雷朋。",
      "MacBook Pro 14寸，银色，外壳有小磕碰，内含大量学习资料。"
  };
  const char *locs[] = {
      "图书馆三楼自习区", "第一食堂二楼",
      "教学楼B203教室", "菜鸟驿站南门柜",
      "西区操场看台", "南门保安室",
      "13号楼宿舍楼下", "篮球场边长椅",
      "菜鸟驿站-南门", "计算机楼A501"
  };
  const char *contacts[] = {
      "电话138****1234", "微信zhangsan001",
      "QQ123456789", "电话159****8888",
      "微信lihua_2021", "前往保安室认领",
      "电话136****5555", "QQ987654321",
      "微信eye_glass_2023", "电话188****6666"
  };
  const char *cats[] = {
      "包具", "证件卡片", "雨伞雨具", "快递包裹",
      "数码产品", "钥匙", "水杯", "手表饰品", "眼镜", "电子产品"
  };
  const char *creators[] = {
      "lixiaoming", "wanghong", "zhangwei", "liumei", "chenjie",
      "zhaoyun", "sunli", "admin", "lixiaoming", "wanghong"
  };

  srand(time(NULL));
  for (int i = 0; i < 10 && lostfound_count < MAX_LOSTFOUND; i++) {
    LostFound *lf = &lostfound_list[lostfound_count];
    lf->id = lostfound_next_id++;
    strcpy(lf->type, types[i % 2]);
    strncpy(lf->title, titles[i], sizeof(lf->title) - 1);
    strncpy(lf->description, descs[i], sizeof(lf->description) - 1);
    strncpy(lf->location, locs[i], sizeof(lf->location) - 1);
    strncpy(lf->contact, contacts[i], sizeof(lf->contact) - 1);
    strncpy(lf->category, cats[i], sizeof(lf->category) - 1);
    strncpy(lf->creator, creators[i], sizeof(lf->creator) - 1);
    strncpy(lf->creator_name, get_user_real_name(creators[i]), sizeof(lf->creator_name) - 1);
    strcpy(lf->status, "active");

    int days_ago = rand() % 30;
    int hours_ago = rand() % 24;
    time_t t = time(NULL) - days_ago * 86400 - hours_ago * 3600;
    struct tm *tm_info = localtime(&t);
    strftime(lf->created_at, sizeof(lf->created_at), "%Y-%m-%d %H:%M:%S", tm_info);
    strcpy(lf->updated_at, lf->created_at);

    lostfound_count++;
  }
  log_message(LOG_INFO, "Seeded %d demo lostfound items", 10);
  save_data();
}

static void seed_demo_data() {
  const char *runner_names[][3] = {
      {"lixiaoming", "李小明", "计算机 2102"},
      {"wanghong", "王虹", "软件工程 2101"},
      {"zhangwei", "张伟", "信安 2102"},
      {"liumei", "刘梅", "数字媒体 2201"},
      {"chenjie", "陈杰", "人工智能 2101"},
      {"zhaoyun", "赵云", "网络工程 2202"},
      {"sunli", "孙丽", "物联网 2101"},
  };
  int runner_count = 7;

  for (int i = 0; i < runner_count && user_count < MAX_USERS; i++) {
    int exists = 0;
    for (int j = 0; j < user_count; j++) {
      if (strcmp(users[j].username, runner_names[i][0]) == 0) {
        exists = 1;
        break;
      }
    }
    if (!exists) {
      strcpy(users[user_count].username, runner_names[i][0]);
      strcpy(users[user_count].password, "123456");
      strcpy(users[user_count].real_name, runner_names[i][1]);
      strcpy(users[user_count].major, runner_names[i][2]);
      users[user_count].balance = 30.0 + (rand() % 50);
      user_count++;
      log_message(LOG_INFO, "Created demo user: %s", runner_names[i][0]);
    }
  }

  if (order_count < 10) {
    const char *packages[] = {"3号楼大纸箱", "数码配件包裹", "衣服快递",
                              "书本包裹", "零食大礼包", "化妆品快递",
                              "运动鞋包裹", "生活用品", "文件快递",
                              "电子产品"};
    const char *pickups[] = {"菜鸟驿站-南门", "顺丰速运-西门",
                             "京东派-北区", "中通圆通-东门"};
    const char *deliveries[] = {"1号楼101", "2号楼305", "3号楼402",
                                "5号楼208", "7号楼501", "9号楼312"};
    const char *rewards[] = {"3.0元", "5.0元", "4.5元", "6.0元", "8.0元"};
    const char *categories[] = {"菜鸟", "顺丰", "京东", "中通"};

    srand(time(NULL));
    for (int i = 0; i < 30 && order_count < MAX_ORDERS; i++) {
      int pkg_idx = rand() % 10;
      int pick_idx = rand() % 4;
      int deliv_idx = rand() % 6;
      int rew_idx = rand() % 5;
      int runner_idx = rand() % runner_count;

      Order *o = &orders[order_count];
      o->id = next_id++;
      strcpy(o->creator, "admin");
      strcpy(o->worker, runner_names[runner_idx][0]);
      strcpy(o->package_info, packages[pkg_idx]);
      strcpy(o->pickup_addr, pickups[pick_idx]);
      strcpy(o->delivery_addr, deliveries[deliv_idx]);
      strcpy(o->reward, rewards[rew_idx]);
      strcpy(o->category, categories[pick_idx]);

      int status_rand = rand() % 10;
      if (status_rand < 7) {
        strcpy(o->status, "completed");
        o->rating = (rand() % 2) + 4;
      } else if (status_rand < 9) {
        strcpy(o->status, "accepted");
        o->rating = 0;
      } else {
        strcpy(o->status, "pending");
        o->rating = 0;
        o->worker[0] = '\0';
      }

      int days_ago = rand() % 45;
      int hours_ago = rand() % 24;
      time_t t = time(NULL) - days_ago * 86400 - hours_ago * 3600;
      struct tm *tm_info = localtime(&t);
      strftime(o->created_at, sizeof(o->created_at), "%Y-%m-%d %H:%M:%S",
               tm_info);

      order_count++;
    }
    log_message(LOG_INFO, "Seeded %d demo orders", 30);
    save_data();
  }
}

void get_stations_json(char *json, const char *exclude_user) {
  typedef struct {
    const char *id;
    const char *name;
    const char *short_name;
    const char *hours;
    const char *phone;
    const char *gate;
    int map_x;
    int map_y;
    const char *color;
    const char *icon;
    const char *keyword;
  } StationDef;

  StationDef stations[] = {
    {"cainiao", "菜鸟驿站-南门", "南门菜鸟", "08:00 - 21:00", "027-88881001", "南门", 25, 78, "#6366f1", "fa-box", "菜鸟"},
    {"sf", "顺丰速运-西门", "西门顺丰", "09:00 - 20:00", "027-88881002", "西门", 80, 50, "#f43f5e", "fa-truck-fast", "顺丰"},
    {"jd", "京东派-北区", "京东派北区", "08:30 - 20:30", "027-88881003", "北区", 50, 15, "#f59e0b", "fa-store", "京东"},
    {"zt", "中通圆通-东门", "中通圆通东门", "08:00 - 21:30", "027-88881004", "东门", 80, 78, "#10b981", "fa-parachute-box", "中通"}
  };

  strcat(json, "[");
  int station_count = sizeof(stations) / sizeof(stations[0]);

  for (int s = 0; s < station_count; s++) {
    if (s > 0) strcat(json, ",");

    int pending = 0;
    for (int i = 0; i < order_count; i++) {
      if (strcmp(orders[i].status, "pending") == 0 &&
          strstr(orders[i].pickup_addr, stations[s].keyword) != NULL) {
        if (exclude_user && strlen(exclude_user) > 0 &&
            strcmp(orders[i].creator, exclude_user) == 0) {
          continue;
        }
        pending++;
      }
    }

    char item[1024];
    sprintf(item,
            "{\"id\":\"%s\",\"name\":\"%s\",\"shortName\":\"%s\","
            "\"hours\":\"%s\",\"phone\":\"%s\",\"gate\":\"%s\","
            "\"mapX\":%d,\"mapY\":%d,\"color\":\"%s\",\"icon\":\"%s\","
            "\"pendingCount\":%d}",
            stations[s].id, stations[s].name, stations[s].short_name,
            stations[s].hours, stations[s].phone, stations[s].gate,
            stations[s].map_x, stations[s].map_y, stations[s].color,
            stations[s].icon, pending);
    strcat(json, item);
  }
  strcat(json, "]");
}

static void escape_template_json(char *dst, const char *src, int max_len) {
  int j = 0;
  for (int i = 0; src[i] && j < max_len - 1; i++) {
    if (src[i] == '"') {
      dst[j++] = '\\';
      dst[j++] = '"';
    } else if (src[i] == '\\') {
      dst[j++] = '\\';
      dst[j++] = '\\';
    } else if (src[i] == '\n') {
      dst[j++] = '\\';
      dst[j++] = 'n';
    } else if (src[i] == '\r') {
      dst[j++] = '\\';
      dst[j++] = 'r';
    } else if (src[i] == '\t') {
      dst[j++] = '\\';
      dst[j++] = 't';
    } else {
      dst[j++] = src[i];
    }
  }
  dst[j] = '\0';
}

void get_templates_json(char *json, const char *creator) {
  strcat(json, "[");
  int first = 1;

  for (int i = 0; i < template_count; i++) {
    if (creator && strlen(creator) > 0 &&
        strcmp(templates[i].creator, creator) != 0)
      continue;

    if (!first)
      strcat(json, ",");

    char esc_name[200], esc_pkg[200], esc_pick[200], esc_deliv[200];
    escape_template_json(esc_name, templates[i].template_name, sizeof(esc_name));
    escape_template_json(esc_pkg, templates[i].package_info, sizeof(esc_pkg));
    escape_template_json(esc_pick, templates[i].pickup_addr, sizeof(esc_pick));
    escape_template_json(esc_deliv, templates[i].delivery_addr, sizeof(esc_deliv));

    char item[2048];
    sprintf(item,
            "{\"id\":%d,\"creator\":\"%s\",\"templateName\":\"%s\","
            "\"package\":\"%s\",\"pickup\":\"%s\",\"delivery\":\"%s\","
            "\"reward\":\"%s\",\"isDefault\":%d,"
            "\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}",
            templates[i].id, templates[i].creator, esc_name,
            esc_pkg, esc_pick, esc_deliv,
            templates[i].reward, templates[i].is_default,
            templates[i].created_at, templates[i].updated_at);
    strcat(json, item);
    first = 0;
  }
  strcat(json, "]");
}

int create_template(const char *creator, const char *template_name, const char *package_info,
                    const char *pickup_addr, const char *delivery_addr, const char *reward) {
  if (template_count >= MAX_TEMPLATES) {
    log_message(LOG_WARN, "Template limit reached");
    return -1;
  }
  if (!creator || strlen(creator) == 0 || !template_name || strlen(template_name) == 0) {
    return -1;
  }

  TaskTemplate *t = &templates[template_count++];
  t->id = template_next_id++;
  strncpy(t->creator, creator, sizeof(t->creator) - 1);
  strncpy(t->template_name, template_name, sizeof(t->template_name) - 1);
  strncpy(t->package_info, package_info ? package_info : "", sizeof(t->package_info) - 1);
  strncpy(t->pickup_addr, pickup_addr ? pickup_addr : "", sizeof(t->pickup_addr) - 1);
  strncpy(t->delivery_addr, delivery_addr ? delivery_addr : "", sizeof(t->delivery_addr) - 1);
  strncpy(t->reward, reward ? reward : "", sizeof(t->reward) - 1);

  int has_default = 0;
  for (int i = 0; i < template_count - 1; i++) {
    if (strcmp(templates[i].creator, creator) == 0 && templates[i].is_default) {
      has_default = 1;
      break;
    }
  }
  t->is_default = has_default ? 0 : 1;

  time_t tm = time(NULL);
  struct tm *tm_info = localtime(&tm);
  strftime(t->created_at, sizeof(t->created_at), "%Y-%m-%d %H:%M:%S", tm_info);
  strcpy(t->updated_at, t->created_at);

  save_data();
  log_message(LOG_INFO, "Template created: ID=%d by %s name=%s", t->id, creator, template_name);
  return t->id;
}

int update_template(int id, const char *creator, const char *template_name, const char *package_info,
                    const char *pickup_addr, const char *delivery_addr, const char *reward) {
  for (int i = 0; i < template_count; i++) {
    if (templates[i].id == id) {
      if (strcmp(templates[i].creator, creator) != 0) {
        log_message(LOG_WARN, "Update template forbidden: user %s not creator of %d", creator, id);
        return -2;
      }

      char tmp[1024];
      if (template_name && strlen(template_name) > 0) {
        strncpy(templates[i].template_name, template_name, sizeof(templates[i].template_name) - 1);
      }
      if (package_info) {
        strncpy(templates[i].package_info, package_info, sizeof(templates[i].package_info) - 1);
      }
      if (pickup_addr) {
        strncpy(templates[i].pickup_addr, pickup_addr, sizeof(templates[i].pickup_addr) - 1);
      }
      if (delivery_addr) {
        strncpy(templates[i].delivery_addr, delivery_addr, sizeof(templates[i].delivery_addr) - 1);
      }
      if (reward) {
        strncpy(templates[i].reward, reward, sizeof(templates[i].reward) - 1);
      }

      time_t tm = time(NULL);
      struct tm *tm_info = localtime(&tm);
      strftime(templates[i].updated_at, sizeof(templates[i].updated_at),
               "%Y-%m-%d %H:%M:%S", tm_info);

      save_data();
      log_message(LOG_INFO, "Template updated: ID=%d", id);
      return 0;
    }
  }
  log_message(LOG_WARN, "Template not found for update: ID=%d", id);
  return -1;
}

int delete_template(int id, const char *creator) {
  for (int i = 0; i < template_count; i++) {
    if (templates[i].id == id) {
      if (strcmp(templates[i].creator, creator) != 0) {
        log_message(LOG_WARN, "Delete template forbidden: user %s not creator of %d", creator, id);
        return -2;

      }

      int was_default = templates[i].is_default;

      for (int j = i; j < template_count - 1; j++) {
        templates[j] = templates[j + 1];
      }
      template_count--;

      if (was_default && template_count > 0) {
        for (int j = 0; j < template_count; j++) {
          if (strcmp(templates[j].creator, creator) == 0) {
            templates[j].is_default = 1;
            break;
          }
        }
      }

      save_data();
      log_message(LOG_INFO, "Template deleted: ID=%d", id);
      return 0;
    }
  }
  log_message(LOG_WARN, "Template not found for delete: ID=%d", id);
  return -1;
}

int set_default_template(int id, const char *creator) {
  for (int i = 0; i < template_count; i++) {
    if (strcmp(templates[i].creator, creator) == 0) {
      templates[i].is_default = (templates[i].id == id) ? 1 : 0;
    }
  }
  save_data();
  log_message(LOG_INFO, "Default template set: ID=%d by %s", id, creator);
  return 0;
}

void load_data() {
  FILE *f1 = fopen("data_orders.bin", "rb");
  if (f1) {
    fread(&order_count, sizeof(int), 1, f1);
    fread(&next_id, sizeof(int), 1, f1);
    fread(orders, sizeof(Order), order_count, f1);
    fclose(f1);
    log_message(LOG_INFO, "Loaded %d orders", order_count);
  } else {
    log_message(LOG_WARN, "No existing orders data found");
  }

  FILE *f2 = fopen("data_users.bin", "rb");
  if (f2) {
    fread(&user_count, sizeof(int), 1, f2);
    fread(users, sizeof(User), user_count, f2);
    fclose(f2);
    log_message(LOG_INFO, "Loaded %d users", user_count);
  } else {
    log_message(LOG_WARN, "No existing users data found");
  }

  FILE *f3 = fopen("data_lostfound.bin", "rb");
  if (f3) {
    fread(&lostfound_count, sizeof(int), 1, f3);
    fread(&lostfound_next_id, sizeof(int), 1, f3);
    fread(lostfound_list, sizeof(LostFound), lostfound_count, f3);
    fclose(f3);
    log_message(LOG_INFO, "Loaded %d lostfound items", lostfound_count);
  } else {
    log_message(LOG_WARN, "No existing lostfound data found");
  }

  FILE *f4 = fopen("data_notifications.bin", "rb");
  if (f4) {
    fread(&notification_count, sizeof(int), 1, f4);
    fread(&notification_next_id, sizeof(int), 1, f4);
    fread(notifications, sizeof(Notification), notification_count, f4);
    fclose(f4);
    log_message(LOG_INFO, "Loaded %d notifications", notification_count);
  } else {
    log_message(LOG_WARN, "No existing notifications data found");
  }

  FILE *f5 = fopen("data_feedbacks.bin", "rb");
  if (f5) {
    fread(&feedback_count, sizeof(int), 1, f5);
    fread(&feedback_next_id, sizeof(int), 1, f5);
    fread(feedbacks, sizeof(Feedback), feedback_count, f5);
    fclose(f5);
    log_message(LOG_INFO, "Loaded %d feedbacks", feedback_count);
  } else {
    log_message(LOG_WARN, "No existing feedbacks data found");
  }

  FILE *f6 = fopen("data_wallet.bin", "rb");
  if (f6) {
    fread(&wallet_txn_count, sizeof(int), 1, f6);
    fread(&wallet_txn_next_id, sizeof(int), 1, f6);
    fread(wallet_txns, sizeof(WalletTransaction), wallet_txn_count, f6);
    fclose(f6);
    log_message(LOG_INFO, "Loaded %d wallet transactions", wallet_txn_count);
  } else {
    log_message(LOG_WARN, "No existing wallet data found");
  }

  FILE *f7 = fopen("data_templates.bin", "rb");
  if (f7) {
    fread(&template_count, sizeof(int), 1, f7);
    fread(&template_next_id, sizeof(int), 1, f7);
    fread(templates, sizeof(TaskTemplate), template_count, f7);
    fclose(f7);
    log_message(LOG_INFO, "Loaded %d templates", template_count);
  } else {
    log_message(LOG_WARN, "No existing templates data found");
  }

  FILE *f8 = fopen("data_reports.bin", "rb");
  if (f8) {
    fread(&report_count, sizeof(int), 1, f8);
    fread(&report_next_id, sizeof(int), 1, f8);
    fread(reports, sizeof(Report), report_count, f8);
    fclose(f8);
    log_message(LOG_INFO, "Loaded %d reports", report_count);
  } else {
    log_message(LOG_WARN, "No existing reports data found");
  }

  FILE *f9 = fopen("data_badges.bin", "rb");
  if (f9) {
    fread(&badge_count, sizeof(int), 1, f9);
    fread(&badge_next_id, sizeof(int), 1, f9);
    fread(badges, sizeof(Badge), badge_count, f9);
    fclose(f9);
    log_message(LOG_INFO, "Loaded %d badges", badge_count);
  } else {
    log_message(LOG_WARN, "No existing badges data found");
  }

  FILE *f10 = fopen("data_share_codes.bin", "rb");
  if (f10) {
    fread(&share_code_count, sizeof(int), 1, f10);
    fread(&share_code_next_id, sizeof(int), 1, f10);
    fread(share_codes, sizeof(ShareCode), share_code_count, f10);
    fclose(f10);
    log_message(LOG_INFO, "Loaded %d share codes", share_code_count);
  } else {
    log_message(LOG_WARN, "No existing share codes data found");
  }

  if (user_count == 0) {
    strcpy(users[user_count].username, "admin");
    strcpy(users[user_count].password, "123456");
    strcpy(users[user_count].real_name, "张小凡");
    strcpy(users[user_count].major, "信安 2101");
    users[user_count].balance = 50.0;
    user_count++;
    save_data();
    log_message(LOG_INFO, "Created default admin user");
  }

  seed_demo_data();
  seed_lostfound_demo_data();
  backfill_order_data();
}

static void escape_report_json(char *dst, const char *src, int max_len) {
  int j = 0;
  for (int i = 0; src[i] && j < max_len - 1; i++) {
    if (src[i] == '"') {
      dst[j++] = '\\';
      dst[j++] = '"';
    } else if (src[i] == '\\') {
      dst[j++] = '\\';
      dst[j++] = '\\';
    } else if (src[i] == '\n') {
      dst[j++] = '\\';
      dst[j++] = 'n';
    } else if (src[i] == '\r') {
      dst[j++] = '\\';
      dst[j++] = 'r';
    } else if (src[i] == '\t') {
      dst[j++] = '\\';
      dst[j++] = 't';
    } else {
      dst[j++] = src[i];
    }
  }
  dst[j] = '\0';
}

void get_reports_json(char *json, const char *reporter) {
  strcat(json, "[");
  int first = 1;

  for (int i = report_count - 1; i >= 0; i--) {
    if (reporter && strlen(reporter) > 0 &&
        strcmp(reports[i].reporter, reporter) != 0)
      continue;

    if (!first)
      strcat(json, ",");

    char esc_desc[2000], esc_note[1000];
    escape_report_json(esc_desc, reports[i].description, sizeof(esc_desc));
    escape_report_json(esc_note, reports[i].handler_note, sizeof(esc_note));

    char item[4096];
    sprintf(item,
            "{\"id\":%d,\"reporter\":\"%s\",\"reportType\":\"%s\","
            "\"description\":\"%s\",\"orderId\":\"%s\",\"targetUser\":\"%s\","
            "\"status\":\"%s\",\"handlerNote\":\"%s\","
            "\"createdAt\":\"%s\",\"updatedAt\":\"%s\",\"handledAt\":\"%s\"}",
            reports[i].id, reports[i].reporter, reports[i].report_type,
            esc_desc, reports[i].order_id, reports[i].target_user,
            reports[i].status, esc_note,
            reports[i].created_at, reports[i].updated_at, reports[i].handled_at);
    strcat(json, item);
    first = 0;
  }
  strcat(json, "]");
}

void get_all_reports_json(char *json, const char *status_filter, const char *type_filter) {
  strcat(json, "[");
  int first = 1;

  for (int i = report_count - 1; i >= 0; i--) {
    if (status_filter && strlen(status_filter) > 0 &&
        strcmp(status_filter, "all") != 0 &&
        strcmp(reports[i].status, status_filter) != 0)
      continue;

    if (type_filter && strlen(type_filter) > 0 &&
        strcmp(type_filter, "all") != 0 &&
        strcmp(reports[i].report_type, type_filter) != 0)
      continue;

    if (!first)
      strcat(json, ",");

    char esc_desc[2000], esc_note[1000];
    escape_report_json(esc_desc, reports[i].description, sizeof(esc_desc));
    escape_report_json(esc_note, reports[i].handler_note, sizeof(esc_note));

    char item[4096];
    sprintf(item,
            "{\"id\":%d,\"reporter\":\"%s\",\"reportType\":\"%s\","
            "\"description\":\"%s\",\"orderId\":\"%s\",\"targetUser\":\"%s\","
            "\"status\":\"%s\",\"handlerNote\":\"%s\","
            "\"createdAt\":\"%s\",\"updatedAt\":\"%s\",\"handledAt\":\"%s\"}",
            reports[i].id, reports[i].reporter, reports[i].report_type,
            esc_desc, reports[i].order_id, reports[i].target_user,
            reports[i].status, esc_note,
            reports[i].created_at, reports[i].updated_at, reports[i].handled_at);
    strcat(json, item);
    first = 0;
  }
  strcat(json, "]");
}

int create_report(const char *reporter, const char *report_type, const char *description,
                  const char *order_id, const char *target_user) {
  if (report_count >= MAX_REPORTS) {
    log_message(LOG_WARN, "Report limit reached");
    return -1;
  }
  if (!reporter || strlen(reporter) == 0 || !report_type || strlen(report_type) == 0) {
    return -1;
  }

  Report *r = &reports[report_count++];
  r->id = report_next_id++;
  strncpy(r->reporter, reporter, sizeof(r->reporter) - 1);
  strncpy(r->report_type, report_type, sizeof(r->report_type) - 1);
  strncpy(r->description, description ? description : "", sizeof(r->description) - 1);
  strncpy(r->order_id, order_id ? order_id : "", sizeof(r->order_id) - 1);
  strncpy(r->target_user, target_user ? target_user : "", sizeof(r->target_user) - 1);
  strcpy(r->status, "pending");
  r->handler_note[0] = '\0';

  time_t t = time(NULL);
  struct tm *tm_info = localtime(&t);
  strftime(r->created_at, sizeof(r->created_at), "%Y-%m-%d %H:%M:%S", tm_info);
  strcpy(r->updated_at, r->created_at);
  r->handled_at[0] = '\0';

  save_data();
  log_message(LOG_INFO, "Report created: ID=%d by %s type=%s", r->id, reporter, report_type);
  return r->id;
}

int update_report_status(int id, const char *status, const char *handler_note) {
  for (int i = 0; i < report_count; i++) {
    if (reports[i].id == id) {
      char old_status[20];
      strcpy(old_status, reports[i].status);

      if (status && strlen(status) > 0) {
        strncpy(reports[i].status, status, sizeof(reports[i].status) - 1);
      }
      if (handler_note && strlen(handler_note) > 0) {
        strncpy(reports[i].handler_note, handler_note, sizeof(reports[i].handler_note) - 1);
      }

      time_t t = time(NULL);
      struct tm *tm_info = localtime(&t);
      strftime(reports[i].updated_at, sizeof(reports[i].updated_at),
               "%Y-%m-%d %H:%M:%S", tm_info);

      if (strcmp(status, "handled") == 0 || strcmp(status, "resolved") == 0 ||
          strcmp(status, "closed") == 0 || strcmp(status, "completed") == 0) {
        strftime(reports[i].handled_at, sizeof(reports[i].handled_at),
                 "%Y-%m-%d %H:%M:%S", tm_info);
      }

      save_data();
      log_message(LOG_INFO, "Report %d status updated: %s -> %s", id, old_status, status);

      char related_id[20];
      snprintf(related_id, sizeof(related_id), "%d", id);
      char summary[500];
      if (strcmp(status, "processing") == 0) {
        snprintf(summary, sizeof(summary), "您的举报工单（#%d）已受理，正在处理中", id);
        create_notification(reports[i].reporter, "report", "举报工单已受理", summary, related_id);
      } else if (strcmp(status, "resolved") == 0 || strcmp(status, "completed") == 0 ||
                 strcmp(status, "handled") == 0) {
        snprintf(summary, sizeof(summary), "您的举报工单（#%d）已处理完成，查看处理详情", id);
        create_notification(reports[i].reporter, "report", "举报工单已处理", summary, related_id);
      } else if (strcmp(status, "rejected") == 0) {
        snprintf(summary, sizeof(summary), "您的举报工单（#%d）未能通过审核，查看详情了解原因", id);
        create_notification(reports[i].reporter, "report", "举报工单已驳回", summary, related_id);
      }

      return 0;
    }
  }
  log_message(LOG_WARN, "Report not found for update: ID=%d", id);
  return -1;
}

Report* find_report_by_id(int id) {
  for (int i = 0; i < report_count; i++) {
    if (reports[i].id == id) {
      return &reports[i];
    }
  }
  return NULL;
}

typedef struct {
  const char *key;
  const char *name;
  const char *icon;
  const char *color;
  const char *condition_desc;
} BadgeDef;

static BadgeDef badge_definitions[] = {
  {"first_order",    "首单告捷",   "fa-flag-checkered", "#10b981", "完成第1单代取任务"},
  {"ten_orders",     "累计十单",   "fa-award",          "#6366f1", "累计完成10单代取任务"},
  {"hundred_orders", "百单达人",   "fa-crown",          "#f59e0b", "累计完成100单代取任务"},
  {"good_reviews",   "好评如潮",   "fa-star",           "#f43f5e", "累计获得5星评价≥5次"},
  {"rain_or_shine",  "风雨无阻",   "fa-cloud-rain",     "#0ea5e9", "累计完成代取任务≥20单"},
  {"night_owl",      "深夜侠影",   "fa-moon",           "#8b5cf6", "在22:00-06:00时段完成过订单"},
};
static int badge_def_count = sizeof(badge_definitions) / sizeof(badge_definitions[0]);

static int has_badge(const char *username, const char *badge_key) {
  for (int i = 0; i < badge_count; i++) {
    if (strcmp(badges[i].username, username) == 0 &&
        strcmp(badges[i].badge_key, badge_key) == 0) {
      return 1;
    }
  }
  return 0;
}

static int unlock_badge(const char *username, const char *badge_key) {
  if (badge_count >= MAX_BADGES) return 0;
  if (has_badge(username, badge_key)) return 0;

  Badge *b = &badges[badge_count++];
  b->id = badge_next_id++;
  strncpy(b->username, username, sizeof(b->username) - 1);
  strncpy(b->badge_key, badge_key, sizeof(b->badge_key) - 1);

  time_t t = time(NULL);
  struct tm *tm_info = localtime(&t);
  strftime(b->unlocked_at, sizeof(b->unlocked_at), "%Y-%m-%d %H:%M:%S", tm_info);

  save_data();
  log_message(LOG_INFO, "Badge unlocked: user=%s badge=%s", username, badge_key);
  return 1;
}

void check_and_unlock_badges(const char *username) {
  if (!username || strlen(username) == 0) return;

  int completed_count = 0;
  int five_star_count = 0;
  int night_order = 0;

  for (int i = 0; i < order_count; i++) {
    if (strcmp(orders[i].worker, username) != 0) continue;
    if (strcmp(orders[i].status, "completed") != 0) continue;

    completed_count++;
    if (orders[i].rating == 5) five_star_count++;

    struct tm tm_order;
    memset(&tm_order, 0, sizeof(struct tm));
    if (sscanf(orders[i].created_at, "%d-%d-%d %d:%d:%d",
               &tm_order.tm_year, &tm_order.tm_mon, &tm_order.tm_mday,
               &tm_order.tm_hour, &tm_order.tm_min, &tm_order.tm_sec) == 6) {
      if (tm_order.tm_hour >= 22 || tm_order.tm_hour < 6) {
        night_order = 1;
      }
    }
  }

  int newly_unlocked = 0;

  if (completed_count >= 1) newly_unlocked += unlock_badge(username, "first_order");
  if (completed_count >= 10) newly_unlocked += unlock_badge(username, "ten_orders");
  if (completed_count >= 100) newly_unlocked += unlock_badge(username, "hundred_orders");
  if (five_star_count >= 5) newly_unlocked += unlock_badge(username, "good_reviews");
  if (completed_count >= 20) newly_unlocked += unlock_badge(username, "rain_or_shine");
  if (night_order) newly_unlocked += unlock_badge(username, "night_owl");

  if (newly_unlocked > 0) {
    for (int i = 0; i < newly_unlocked && i < 3; i++) {
      char summary[200];
      snprintf(summary, sizeof(summary), "你解锁了新成就勋章，快去个人中心查看吧！");
      create_notification(username, "system", "新勋章解锁", summary, "");
    }
  }
}

static void escape_badge_json(char *dst, const char *src, int max_len) {
  int j = 0;
  for (int i = 0; src[i] && j < max_len - 1; i++) {
    if (src[i] == '"') {
      dst[j++] = '\\';
      dst[j++] = '"';
    } else if (src[i] == '\\') {
      dst[j++] = '\\';
      dst[j++] = '\\';
    } else {
      dst[j++] = src[i];
    }
  }
  dst[j] = '\0';
}

void get_badges_json(char *json, const char *username) {
  strcat(json, "[");
  int first = 1;

  for (int d = 0; d < badge_def_count; d++) {
    if (!first) strcat(json, ",");

    int unlocked = 0;
    char unlocked_at[32] = "";
    for (int i = 0; i < badge_count; i++) {
      if (strcmp(badges[i].username, username) == 0 &&
          strcmp(badges[i].badge_key, badge_definitions[d].key) == 0) {
        unlocked = 1;
        strncpy(unlocked_at, badges[i].unlocked_at, sizeof(unlocked_at) - 1);
        break;
      }
    }

    char esc_name[100], esc_desc[200];
    escape_badge_json(esc_name, badge_definitions[d].name, sizeof(esc_name));
    escape_badge_json(esc_desc, badge_definitions[d].condition_desc, sizeof(esc_desc));

    char item[1024];
    sprintf(item,
            "{\"key\":\"%s\",\"name\":\"%s\",\"icon\":\"%s\","
            "\"color\":\"%s\",\"conditionDesc\":\"%s\","
            "\"unlocked\":%s,\"unlockedAt\":\"%s\"}",
            badge_definitions[d].key, esc_name, badge_definitions[d].icon,
            badge_definitions[d].color, esc_desc,
            unlocked ? "true" : "false", unlocked ? unlocked_at : "");
    strcat(json, item);
    first = 0;
  }

  strcat(json, "]");
}

static void generate_random_code(char *out, int length) {
  const char chars[] = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  int chars_len = strlen(chars);
  for (int i = 0; i < length; i++) {
    out[i] = chars[rand() % chars_len];
  }
  out[length] = '\0';
}

static int is_code_unique(const char *code) {
  for (int i = 0; i < share_code_count; i++) {
    if (strcmp(share_codes[i].code, code) == 0 && share_codes[i].is_valid) {
      return 0;
    }
  }
  return 1;
}

static int parse_datetime(const char *datetime_str, time_t *out_time) {
  struct tm tm_info;
  memset(&tm_info, 0, sizeof(struct tm));
  if (sscanf(datetime_str, "%d-%d-%d %d:%d:%d",
             &tm_info.tm_year, &tm_info.tm_mon, &tm_info.tm_mday,
             &tm_info.tm_hour, &tm_info.tm_min, &tm_info.tm_sec) != 6) {
    return -1;
  }
  tm_info.tm_year -= 1900;
  tm_info.tm_mon -= 1;
  *out_time = mktime(&tm_info);
  return 0;
}

int generate_share_code(const char *creator, int order_id, char *out_code) {
  cleanup_expired_share_codes();

  for (int i = 0; i < share_code_count; i++) {
    if (share_codes[i].order_id == order_id &&
        strcmp(share_codes[i].creator, creator) == 0 &&
        share_codes[i].is_valid) {
      time_t now = time(NULL);
      time_t expires_at;
      if (parse_datetime(share_codes[i].expires_at, &expires_at) == 0 &&
          difftime(expires_at, now) > 0) {
        strncpy(out_code, share_codes[i].code, 8);
        return share_codes[i].id;
      } else {
        share_codes[i].is_valid = 0;
      }
    }
  }

  for (int i = 0; i < order_count; i++) {
    if (orders[i].id == order_id) {
      if (strcmp(orders[i].creator, creator) != 0) {
        return -2;
      }
      if (strcmp(orders[i].status, "pending") != 0) {
        return -3;
      }
      break;
    }
  }

  if (share_code_count >= MAX_SHARE_CODES) {
    return -1;
  }

  char new_code[8];
  int attempts = 0;
  do {
    generate_random_code(new_code, 6);
    attempts++;
  } while (!is_code_unique(new_code) && attempts < 100);

  if (attempts >= 100) {
    return -1;
  }

  ShareCode *sc = &share_codes[share_code_count++];
  sc->id = share_code_next_id++;
  strncpy(sc->code, new_code, sizeof(sc->code) - 1);
  sc->order_id = order_id;
  strncpy(sc->creator, creator, sizeof(sc->creator) - 1);
  sc->is_valid = 1;

  time_t t = time(NULL);
  struct tm *tm_info = localtime(&t);
  strftime(sc->created_at, sizeof(sc->created_at), "%Y-%m-%d %H:%M:%S", tm_info);

  time_t expire_time = t + 24 * 3600;
  struct tm *expire_tm = localtime(&expire_time);
  strftime(sc->expires_at, sizeof(sc->expires_at), "%Y-%m-%d %H:%M:%S", expire_tm);

  strncpy(out_code, sc->code, 8);
  save_data();
  log_message(LOG_INFO, "Share code generated: %s for order %d by %s", sc->code, order_id, creator);
  return sc->id;
}

int verify_share_code(const char *code, int *out_order_id, char *out_message) {
  cleanup_expired_share_codes();

  if (!code || strlen(code) != 6) {
    if (out_message) strcpy(out_message, "口令格式不正确");
    return -1;
  }

  char upper_code[8];
  strncpy(upper_code, code, sizeof(upper_code) - 1);
  upper_code[6] = '\0';
  for (int i = 0; i < 6; i++) {
    if (upper_code[i] >= 'a' && upper_code[i] <= 'z') {
      upper_code[i] = upper_code[i] - 'a' + 'A';
    }
  }

  for (int i = 0; i < share_code_count; i++) {
    if (strcmp(share_codes[i].code, upper_code) == 0) {
      if (!share_codes[i].is_valid) {
        if (out_message) strcpy(out_message, "该口令已失效");
        return -2;
      }

      time_t now = time(NULL);
      time_t expires_at;
      if (parse_datetime(share_codes[i].expires_at, &expires_at) != 0 ||
          difftime(expires_at, now) <= 0) {
        share_codes[i].is_valid = 0;
        save_data();
        if (out_message) strcpy(out_message, "该口令已过期");
        return -3;
      }

      int order_found = 0;
      for (int j = 0; j < order_count; j++) {
        if (orders[j].id == share_codes[i].order_id) {
          order_found = 1;
          if (strcmp(orders[j].status, "pending") != 0) {
            share_codes[i].is_valid = 0;
            save_data();
            if (out_message) {
              if (strcmp(orders[j].status, "cancelled") == 0) {
                strcpy(out_message, "该订单已被撤回，口令失效");
              } else {
                strcpy(out_message, "该订单已被接单，口令失效");
              }
            }
            return -4;
          }
          break;
        }
      }

      if (!order_found) {
        if (out_message) strcpy(out_message, "订单不存在");
        return -5;
      }

      if (out_order_id) {
        *out_order_id = share_codes[i].order_id;
      }
      if (out_message) strcpy(out_message, "验证成功");
      return 0;
    }
  }

  if (out_message) strcpy(out_message, "口令不存在");
  return -6;
}

void get_share_code_by_order_json(char *json, int order_id, const char *creator) {
  cleanup_expired_share_codes();

  strcpy(json, "{\"exists\":false");

  for (int i = 0; i < share_code_count; i++) {
    if (share_codes[i].order_id == order_id &&
        strcmp(share_codes[i].creator, creator) == 0 &&
        share_codes[i].is_valid) {
      time_t now = time(NULL);
      time_t expires_at;
      if (parse_datetime(share_codes[i].expires_at, &expires_at) == 0 &&
          difftime(expires_at, now) > 0) {
        sprintf(json + strlen(json),
                ",\"exists\":true,\"code\":\"%s\",\"orderId\":%d,"
                "\"createdAt\":\"%s\",\"expiresAt\":\"%s\","
                "\"expiresInSeconds\":%.0f",
                share_codes[i].code, share_codes[i].order_id,
                share_codes[i].created_at, share_codes[i].expires_at,
                difftime(expires_at, now));
        break;
      }
    }
  }

  strcat(json, "}");
}

void cleanup_expired_share_codes() {
  time_t now = time(NULL);
  int changed = 0;

  for (int i = 0; i < share_code_count; i++) {
    if (share_codes[i].is_valid) {
      time_t expires_at;
      if (parse_datetime(share_codes[i].expires_at, &expires_at) == 0 &&
          difftime(expires_at, now) <= 0) {
        share_codes[i].is_valid = 0;
        changed = 1;
      }

      int order_active = 0;
      for (int j = 0; j < order_count; j++) {
        if (orders[j].id == share_codes[i].order_id &&
            strcmp(orders[j].status, "pending") == 0) {
          order_active = 1;
          break;
        }
      }
      if (!order_active) {
        share_codes[i].is_valid = 0;
        changed = 1;
      }
    }
  }

  if (changed) {
    save_data();
  }
}
