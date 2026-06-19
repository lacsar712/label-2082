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
  backfill_order_data();
}
