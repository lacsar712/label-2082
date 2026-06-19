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

  if (user_count == 0) {
    strcpy(users[user_count].username, "admin");
    strcpy(users[user_count].password, "123456");
    strcpy(users[user_count].real_name, "张小凡");
    strcpy(users[user_count].major, "信安 2101");
    user_count++;
    save_data();
    log_message(LOG_INFO, "Created default admin user");
  }

  seed_demo_data();
  seed_lostfound_demo_data();
  backfill_order_data();
}
