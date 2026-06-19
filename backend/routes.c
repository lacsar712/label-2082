#include "routes.h"
#include "database.h"
#include "json_parser.h"
#include "logger.h"
#include "types.h"
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>

static void send_file(int client_socket, const char *path,
                      const char *content_type) {
  int fd = open(path, O_RDONLY);
  if (fd < 0) {
    log_message(LOG_ERROR, "Failed to open file: %s", path);
    char response[] = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
    send(client_socket, response, strlen(response), 0);
    return;
  }

  char header[256];
  snprintf(header, sizeof(header),
           "HTTP/1.1 200 OK\r\nContent-Type: %s\r\n\r\n", content_type);
  send(client_socket, header, strlen(header), 0);

  char file_buf[BUFFER_SIZE];
  int n;
  while ((n = read(fd, file_buf, BUFFER_SIZE)) > 0) {
    send(client_socket, file_buf, n, 0);
  }
  close(fd);
  log_message(LOG_INFO, "Served file: %s", path);
}

static void handle_register(int client_socket, char *body) {
  User u;
  memset(&u, 0, sizeof(User));

  parse_json_string(body, "username", u.username, sizeof(u.username));
  parse_json_string(body, "password", u.password, sizeof(u.password));
  parse_json_string(body, "realName", u.real_name, sizeof(u.real_name));
  parse_json_string(body, "major", u.major, sizeof(u.major));

  if (strlen(u.username) == 0 || strlen(u.password) == 0) {
    log_message(LOG_WARN, "Registration failed: missing credentials");
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  for (int i = 0; i < user_count; i++) {
    if (strcmp(users[i].username, u.username) == 0) {
      log_message(LOG_WARN, "Registration failed: username already exists: %s",
                  u.username);
      char resp[] =
          "HTTP/1.1 409 Conflict\r\nContent-Type: "
          "application/"
          "json\r\n\r\n{\"status\":\"error\",\"message\":\"用户名已存在\"}";
      send(client_socket, resp, strlen(resp), 0);
      return;
    }
  }

  if (user_count < MAX_USERS) {
    users[user_count++] = u;
    save_data();
    log_message(LOG_INFO, "User registered: %s (%s)", u.username, u.real_name);

    char resp[512];
    snprintf(resp, sizeof(resp),
             "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
             "{\"status\":\"success\",\"username\":\"%s\",\"realName\":\"%s\","
             "\"major\":\"%s\",\"balance\":%.2f}",
             u.username, u.real_name, u.major, u.balance);
    send(client_socket, resp, strlen(resp), 0);
  } else {
    log_message(LOG_ERROR, "Registration failed: max users reached");
    char resp[] = "HTTP/1.1 500 Internal Server Error\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\"}";
    send(client_socket, resp, strlen(resp), 0);
  }
}

static void handle_login(int client_socket, char *body) {
  char user[50] = "", pass[50] = "";
  parse_json_string(body, "username", user, sizeof(user));
  parse_json_string(body, "password", pass, sizeof(pass));

  int found = -1;
  for (int i = 0; i < user_count; i++) {
    if (strcmp(users[i].username, user) == 0 &&
        strcmp(users[i].password, pass) == 0) {
      found = i;
      break;
    }
  }

  if (found != -1) {
    char resp[512];
    snprintf(resp, sizeof(resp),
             "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
             "{\"status\":\"success\",\"username\":\"%s\",\"realName\":\"%s\","
             "\"major\":\"%s\",\"balance\":%.2f}",
             users[found].username, users[found].real_name, users[found].major,
             users[found].balance);
    send(client_socket, resp, strlen(resp), 0);
    log_message(LOG_INFO, "User logged in: %s", user);
  } else {
    char resp[] =
        "HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\n\r\n"
        "{\"status\":\"error\",\"message\":\"账号或密码错误\"}";
    send(client_socket, resp, strlen(resp), 0);
    log_message(LOG_WARN, "Login failed for user: %s", user);
  }
}

static void handle_get_orders(int client_socket, char *query_string) {
  char creator[50] = "", worker[50] = "", category[50] = "";

  if (query_string) {
    char *cr_ptr = strstr(query_string, "creator=");
    if (cr_ptr)
      sscanf(cr_ptr + 8, "%[^& ]", creator);
    char *wr_ptr = strstr(query_string, "worker=");
    if (wr_ptr)
      sscanf(wr_ptr + 7, "%[^& ]", worker);
    char *ct_ptr = strstr(query_string, "category=");
    if (ct_ptr)
      sscanf(ct_ptr + 9, "%[^& ]", category);
  }

  char response_header[] = "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
                           "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(MAX_ORDERS * 1024);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for orders JSON");
    return;
  }
  memset(json, 0, MAX_ORDERS * 1024);
  get_orders_json(json, creator, worker, category);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "Orders fetched - creator:%s worker:%s category:%s",
              creator[0] ? creator : "all", worker[0] ? worker : "all",
              category[0] ? category : "all");
}

static void handle_create_order(int client_socket, char *body) {
  Order new_order;
  memset(&new_order, 0, sizeof(Order));
  new_order.id = next_id++;

  parse_json_string(body, "package", new_order.package_info,
                    sizeof(new_order.package_info));
  parse_json_string(body, "pickup", new_order.pickup_addr,
                    sizeof(new_order.pickup_addr));
  parse_json_string(body, "delivery", new_order.delivery_addr,
                    sizeof(new_order.delivery_addr));
  parse_json_string(body, "reward", new_order.reward, sizeof(new_order.reward));
  parse_json_string(body, "creator", new_order.creator,
                    sizeof(new_order.creator));
  new_order.use_balance_deduction = parse_json_int(body, "useBalanceDeduction");

  if (strstr(new_order.pickup_addr, "菜鸟"))
    strcpy(new_order.category, "菜鸟");
  else if (strstr(new_order.pickup_addr, "顺丰"))
    strcpy(new_order.category, "顺丰");
  else if (strstr(new_order.pickup_addr, "京东"))
    strcpy(new_order.category, "京东");
  else if (strstr(new_order.pickup_addr, "中通") ||
           strstr(new_order.pickup_addr, "圆通"))
    strcpy(new_order.category, "中通");
  else
    strcpy(new_order.category, "其他");

  strcpy(new_order.status, "pending");

  time_t t = time(NULL);
  struct tm *tm_info = localtime(&t);
  strftime(new_order.created_at, sizeof(new_order.created_at),
           "%Y-%m-%d %H:%M:%S", tm_info);

  if (order_count < MAX_ORDERS) {
    orders[order_count++] = new_order;
    save_data();
    log_message(LOG_INFO, "Order created: ID=%d by %s", new_order.id,
                new_order.creator);
    char response[] = "HTTP/1.1 200 OK\r\nContent-Type: "
                      "application/json\r\n\r\n{\"status\":\"success\"}";
    send(client_socket, response, strlen(response), 0);
  } else {
    log_message(LOG_ERROR, "Failed to create order: max orders reached");
    char response[] = "HTTP/1.1 500 Internal Server Error\r\nContent-Type: "
                      "application/json\r\n\r\n{\"status\":\"error\"}";
    send(client_socket, response, strlen(response), 0);
  }
}

static void handle_update_status(int client_socket, char *body) {
  int id = -1;
  char new_status[20] = "", worker[50] = "";

  char *id_ptr = strstr(body, "\"id\":");
  if (id_ptr)
    sscanf(id_ptr + 5, "%d", &id);

  parse_json_string(body, "status", new_status, sizeof(new_status));
  parse_json_string(body, "worker", worker, sizeof(worker));

  for (int i = 0; i < order_count; i++) {
    if (orders[i].id == id) {
      char old_status[20];
      strcpy(old_status, orders[i].status);
      strcpy(orders[i].status, new_status);
      if (strcmp(new_status, "accepted") == 0 && strlen(worker) > 0) {
        strcpy(orders[i].worker, worker);
      }
      save_data();
      log_message(LOG_INFO, "Order %d status updated to: %s", id, new_status);

      char related_id[20];
      snprintf(related_id, sizeof(related_id), "%d", id);
      char summary[300];

      if (strcmp(new_status, "accepted") != 0 || strcmp(old_status, "pending") == 0) {
        if (strcmp(new_status, "accepted") == 0) {
          snprintf(summary, sizeof(summary), "您的订单（%s）已被 %s 接单，请耐心等待送达",
                   orders[i].package_info, get_user_real_name(orders[i].worker));
          create_notification(orders[i].creator, "order", "订单已被接单", summary, related_id);
          snprintf(summary, sizeof(summary), "您已成功接单：%s，取件地址：%s",
                   orders[i].package_info, orders[i].pickup_addr);
          create_notification(orders[i].worker, "order", "接单成功", summary, related_id);
        } else if (strcmp(new_status, "delivered") == 0) {
          snprintf(summary, sizeof(summary), "订单（%s）已送达，请及时确认收货并完成支付",
                   orders[i].package_info);
          create_notification(orders[i].creator, "order", "订单已送达", summary, related_id);
        } else if (strcmp(new_status, "completed") == 0) {
          snprintf(summary, sizeof(summary), "订单（%s）已确认完成，感谢您的服务！",
                   orders[i].package_info);
          create_notification(orders[i].worker, "order", "订单已完成", summary, related_id);
          snprintf(summary, sizeof(summary), "您的订单（%s）已完成，感谢使用校递快跑！",
                   orders[i].package_info);
          create_notification(orders[i].creator, "order", "订单已完成", summary, related_id);

          if (strcmp(old_status, "completed") != 0 &&
              strlen(orders[i].worker) > 0) {
            double reward_amount = 0.0;
            sscanf(orders[i].reward, "%lf", &reward_amount);
            if (reward_amount > 0) {
              char desc_income[200];
              snprintf(desc_income, sizeof(desc_income),
                       "跑腿收入：%s", orders[i].package_info);
              char remark_income[100];
              if (orders[i].use_balance_deduction) {
                strcpy(remark_income, "余额结算收入");
                add_wallet_transaction(orders[i].worker, "income", reward_amount,
                                       desc_income, related_id, remark_income);
              } else {
                strcpy(remark_income, "线下结算收入");
                record_wallet_transaction(orders[i].worker, "income", reward_amount,
                                          desc_income, related_id, remark_income);
              }

              char desc_expense[200];
              snprintf(desc_expense, sizeof(desc_expense),
                       "发布悬赏：%s", orders[i].package_info);
              char remark_expense[100];
              if (orders[i].use_balance_deduction) {
                strcpy(remark_expense, "余额抵扣支付");
                add_wallet_transaction(orders[i].creator, "expense", reward_amount,
                                       desc_expense, related_id, remark_expense);
              } else {
                strcpy(remark_expense, "线下支付");
                record_wallet_transaction(orders[i].creator, "expense", reward_amount,
                                          desc_expense, related_id, remark_expense);
              }
            }
          }

          check_and_unlock_badges(orders[i].worker);
        } else if (strcmp(new_status, "cancelled") == 0) {
          if (strlen(orders[i].worker) > 0) {
            snprintf(summary, sizeof(summary), "订单（%s）已被发布者撤回",
                     orders[i].package_info);
            create_notification(orders[i].worker, "order", "订单已被撤回", summary, related_id);
          }
        }
      }

      char response[] = "HTTP/1.1 200 OK\r\nContent-Type: "
                        "application/json\r\n\r\n{\"status\":\"success\"}";
      send(client_socket, response, strlen(response), 0);
      return;
    }
  }

  log_message(LOG_WARN, "Order not found or invalid: ID=%d", id);
  char response[] = "HTTP/1.1 404 Not Found\r\nContent-Type: "
                    "application/json\r\n\r\n{\"status\":\"error\"}";
  send(client_socket, response, strlen(response), 0);
}

static void handle_update_profile(int client_socket, char *body) {
  char username[50] = "", real_name[50] = "", major[50] = "", pwd[50] = "";

  parse_json_string(body, "username", username, sizeof(username));
  parse_json_string(body, "realName", real_name, sizeof(real_name));
  parse_json_string(body, "major", major, sizeof(major));
  parse_json_string(body, "password", pwd, sizeof(pwd));

  for (int i = 0; i < user_count; i++) {
    if (strcmp(users[i].username, username) == 0) {
      if (strlen(real_name) > 0)
        strcpy(users[i].real_name, real_name);
      if (strlen(major) > 0)
        strcpy(users[i].major, major);
      if (strlen(pwd) > 0)
        strcpy(users[i].password, pwd);
      save_data();
      log_message(LOG_INFO, "Profile updated for user: %s", username);
      char response[] = "HTTP/1.1 200 OK\r\nContent-Type: "
                        "application/json\r\n\r\n{\"status\":\"success\"}";
      send(client_socket, response, strlen(response), 0);
      return;
    }
  }

  log_message(LOG_WARN, "User not found for profile update: %s", username);
  char response[] = "HTTP/1.1 404 Not Found\r\nContent-Type: "
                    "application/json\r\n\r\n{\"status\":\"error\"}";
  send(client_socket, response, strlen(response), 0);
}

static void handle_get_leaderboard(int client_socket, char *query_string) {
  char period[20] = "total";
  if (query_string) {
    char *p_ptr = strstr(query_string, "period=");
    if (p_ptr) {
      char decoded[20] = {0};
      sscanf(p_ptr + 7, "%[^& ]", decoded);
      if (strcmp(decoded, "week") == 0 || strcmp(decoded, "month") == 0 ||
          strcmp(decoded, "total") == 0) {
        strncpy(period, decoded, sizeof(period) - 1);
      }
    }
  }

  char response_header[] =
      "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
      "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(MAX_USERS * 512);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for leaderboard JSON");
    return;
  }
  memset(json, 0, MAX_USERS * 512);
  get_leaderboard_json(json, period);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "Leaderboard fetched - period: %s", period);
}

static void handle_get_runner_detail(int client_socket, char *query_string) {
  char username[50] = "";
  if (query_string) {
    char *u_ptr = strstr(query_string, "username=");
    if (u_ptr) {
      char decoded[50] = {0};
      sscanf(u_ptr + 9, "%[^& ]", decoded);
      strncpy(username, decoded, sizeof(username) - 1);
    }
  }

  if (strlen(username) == 0) {
    char response[] =
        "HTTP/1.1 400 Bad Request\r\nContent-Type: "
        "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少username参数\"}";
    send(client_socket, response, strlen(response), 0);
    return;
  }

  char response_header[] =
      "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
      "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(20 * 512 + 1024);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for runner detail JSON");
    return;
  }
  memset(json, 0, 20 * 512 + 1024);
  get_runner_detail_json(json, username);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "Runner detail fetched - username: %s", username);
}

static void handle_get_lostfound(int client_socket, char *query_string) {
  char type_filter[50] = "", category_filter[100] = "";
  char keyword[200] = "", sort_order[20] = "", creator_filter[50] = "";

  if (query_string) {
    char *q;
    q = strstr(query_string, "type=");
    if (q) sscanf(q + 5, "%[^& ]", type_filter);
    q = strstr(query_string, "category=");
    if (q) sscanf(q + 9, "%[^& ]", category_filter);
    q = strstr(query_string, "keyword=");
    if (q) sscanf(q + 8, "%[^& ]", keyword);
    q = strstr(query_string, "sort=");
    if (q) sscanf(q + 5, "%[^& ]", sort_order);
    q = strstr(query_string, "creator=");
    if (q) sscanf(q + 8, "%[^& ]", creator_filter);
  }

  char response_header[] =
      "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
      "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(MAX_LOSTFOUND * 2048);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for lostfound JSON");
    return;
  }
  memset(json, 0, MAX_LOSTFOUND * 2048);
  get_lostfound_json(json, type_filter, category_filter, keyword, sort_order, creator_filter);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "LostFound fetched - type:%s cat:%s kw:%s sort:%s creator:%s",
              type_filter[0] ? type_filter : "all",
              category_filter[0] ? category_filter : "all",
              keyword[0] ? keyword : "none",
              sort_order[0] ? sort_order : "desc",
              creator_filter[0] ? creator_filter : "all");
}

static void handle_create_lostfound(int client_socket, char *body) {
  LostFound new_lf;
  memset(&new_lf, 0, sizeof(LostFound));
  new_lf.id = lostfound_next_id++;

  parse_json_string(body, "type", new_lf.type, sizeof(new_lf.type));
  parse_json_string(body, "title", new_lf.title, sizeof(new_lf.title));
  parse_json_string(body, "description", new_lf.description, sizeof(new_lf.description));
  parse_json_string(body, "location", new_lf.location, sizeof(new_lf.location));
  parse_json_string(body, "contact", new_lf.contact, sizeof(new_lf.contact));
  parse_json_string(body, "category", new_lf.category, sizeof(new_lf.category));
  parse_json_string(body, "creator", new_lf.creator, sizeof(new_lf.creator));

  if (strlen(new_lf.title) == 0 || strlen(new_lf.type) == 0 ||
      strlen(new_lf.creator) == 0) {
    log_message(LOG_WARN, "Create lostfound failed: missing fields");
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少必填字段\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  strncpy(new_lf.creator_name, get_user_real_name(new_lf.creator), sizeof(new_lf.creator_name) - 1);
  strcpy(new_lf.status, "active");

  time_t t = time(NULL);
  struct tm *tm_info = localtime(&t);
  strftime(new_lf.created_at, sizeof(new_lf.created_at), "%Y-%m-%d %H:%M:%S", tm_info);
  strcpy(new_lf.updated_at, new_lf.created_at);

  if (lostfound_count < MAX_LOSTFOUND) {
    lostfound_list[lostfound_count++] = new_lf;
    save_data();
    log_message(LOG_INFO, "LostFound created: ID=%d by %s", new_lf.id, new_lf.creator);
    char resp[] = "HTTP/1.1 200 OK\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"success\"}";
    send(client_socket, resp, strlen(resp), 0);
  } else {
    log_message(LOG_ERROR, "Failed to create lostfound: max reached");
    char resp[] = "HTTP/1.1 500 Internal Server Error\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\"}";
    send(client_socket, resp, strlen(resp), 0);
  }
}

static void handle_update_lostfound(int client_socket, char *body) {
  int id = parse_json_int(body, "id");
  char username[50] = "";
  parse_json_string(body, "creator", username, sizeof(username));

  if (id == -1) {
    char response[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                      "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少id\"}";
    send(client_socket, response, strlen(response), 0);
    return;
  }

  for (int i = 0; i < lostfound_count; i++) {
    if (lostfound_list[i].id == id) {
      if (strcmp(lostfound_list[i].creator, username) != 0) {
        char response[] = "HTTP/1.1 403 Forbidden\r\nContent-Type: "
                          "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"无权限编辑\"}";
        send(client_socket, response, strlen(response), 0);
        log_message(LOG_WARN, "Update lostfound forbidden: user %s not creator of %d", username, id);
        return;
      }

      char tmp_buf[1024];
      parse_json_string(body, "type", tmp_buf, sizeof(tmp_buf));
      if (strlen(tmp_buf) > 0) strncpy(lostfound_list[i].type, tmp_buf, sizeof(lostfound_list[i].type) - 1);

      parse_json_string(body, "title", tmp_buf, sizeof(tmp_buf));
      if (strlen(tmp_buf) > 0) strncpy(lostfound_list[i].title, tmp_buf, sizeof(lostfound_list[i].title) - 1);

      parse_json_string(body, "description", tmp_buf, sizeof(tmp_buf));
      if (strlen(tmp_buf) > 0) strncpy(lostfound_list[i].description, tmp_buf, sizeof(lostfound_list[i].description) - 1);

      parse_json_string(body, "location", tmp_buf, sizeof(tmp_buf));
      if (strlen(tmp_buf) > 0) strncpy(lostfound_list[i].location, tmp_buf, sizeof(lostfound_list[i].location) - 1);

      parse_json_string(body, "contact", tmp_buf, sizeof(tmp_buf));
      if (strlen(tmp_buf) > 0) strncpy(lostfound_list[i].contact, tmp_buf, sizeof(lostfound_list[i].contact) - 1);

      parse_json_string(body, "category", tmp_buf, sizeof(tmp_buf));
      if (strlen(tmp_buf) > 0) strncpy(lostfound_list[i].category, tmp_buf, sizeof(lostfound_list[i].category) - 1);

      time_t t = time(NULL);
      struct tm *tm_info = localtime(&t);
      strftime(lostfound_list[i].updated_at, sizeof(lostfound_list[i].updated_at),
               "%Y-%m-%d %H:%M:%S", tm_info);

      save_data();
      log_message(LOG_INFO, "LostFound updated: ID=%d", id);
      char response[] = "HTTP/1.1 200 OK\r\nContent-Type: "
                        "application/json\r\n\r\n{\"status\":\"success\"}";
      send(client_socket, response, strlen(response), 0);
      return;
    }
  }

  log_message(LOG_WARN, "LostFound not found for update: ID=%d", id);
  char response[] = "HTTP/1.1 404 Not Found\r\nContent-Type: "
                    "application/json\r\n\r\n{\"status\":\"error\"}";
  send(client_socket, response, strlen(response), 0);
}

static void handle_offline_lostfound(int client_socket, char *body) {
  int id = parse_json_int(body, "id");
  char username[50] = "";
  parse_json_string(body, "creator", username, sizeof(username));

  if (id == -1) {
    char response[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                      "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少id\"}";
    send(client_socket, response, strlen(response), 0);
    return;
  }

  for (int i = 0; i < lostfound_count; i++) {
    if (lostfound_list[i].id == id) {
      if (strcmp(lostfound_list[i].creator, username) != 0) {
        char response[] = "HTTP/1.1 403 Forbidden\r\nContent-Type: "
                          "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"无权限操作\"}";
        send(client_socket, response, strlen(response), 0);
        log_message(LOG_WARN, "Offline lostfound forbidden: user %s not creator of %d", username, id);
        return;
      }

      strcpy(lostfound_list[i].status, "offline");
      save_data();
      log_message(LOG_INFO, "LostFound offline: ID=%d", id);
      char response[] = "HTTP/1.1 200 OK\r\nContent-Type: "
                        "application/json\r\n\r\n{\"status\":\"success\"}";
      send(client_socket, response, strlen(response), 0);
      return;
    }
  }

  log_message(LOG_WARN, "LostFound not found for offline: ID=%d", id);
  char response[] = "HTTP/1.1 404 Not Found\r\nContent-Type: "
                    "application/json\r\n\r\n{\"status\":\"error\"}";
  send(client_socket, response, strlen(response), 0);
}

static void handle_get_notifications(int client_socket, char *query_string) {
  char username[50] = "";
  int unread_only = 0;

  if (query_string) {
    char *u_ptr = strstr(query_string, "username=");
    if (u_ptr) {
      char decoded[50] = {0};
      sscanf(u_ptr + 9, "%[^& ]", decoded);
      strncpy(username, decoded, sizeof(username) - 1);
    }
    if (strstr(query_string, "unread=1") || strstr(query_string, "unread=true")) {
      unread_only = 1;
    }
  }

  if (strlen(username) == 0) {
    char response[] =
        "HTTP/1.1 400 Bad Request\r\nContent-Type: "
        "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少username参数\"}";
    send(client_socket, response, strlen(response), 0);
    return;
  }

  char response_header[] =
      "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
      "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(MAX_NOTIFICATIONS * 1024);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for notifications JSON");
    return;
  }
  memset(json, 0, MAX_NOTIFICATIONS * 1024);
  get_notifications_json(json, username, unread_only);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "Notifications fetched - user:%s unread_only:%d", username, unread_only);
}

static void handle_get_unread_count(int client_socket, char *query_string) {
  char username[50] = "";

  if (query_string) {
    char *u_ptr = strstr(query_string, "username=");
    if (u_ptr) {
      char decoded[50] = {0};
      sscanf(u_ptr + 9, "%[^& ]", decoded);
      strncpy(username, decoded, sizeof(username) - 1);
    }
  }

  if (strlen(username) == 0) {
    char response[] =
        "HTTP/1.1 400 Bad Request\r\nContent-Type: "
        "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少username参数\"}";
    send(client_socket, response, strlen(response), 0);
    return;
  }

  int count = get_unread_notification_count(username);
  char resp[256];
  snprintf(resp, sizeof(resp),
           "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
           "{\"status\":\"success\",\"count\":%d}",
           count);
  send(client_socket, resp, strlen(resp), 0);

  log_message(LOG_INFO, "Unread count fetched - user:%s count:%d", username, count);
}

static void handle_mark_read(int client_socket, char *body) {
  int id = parse_json_int(body, "id");
  char username[50] = "";
  parse_json_string(body, "username", username, sizeof(username));

  if (id == -1) {
    char response[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                      "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少id\"}";
    send(client_socket, response, strlen(response), 0);
    return;
  }

  for (int i = 0; i < notification_count; i++) {
    if (notifications[i].id == id) {
      if (strlen(username) > 0 &&
          strcmp(notifications[i].username, username) != 0) {
        char response[] = "HTTP/1.1 403 Forbidden\r\nContent-Type: "
                          "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"无权限操作\"}";
        send(client_socket, response, strlen(response), 0);
        return;
      }
      notifications[i].is_read = 1;
      save_data();
      log_message(LOG_INFO, "Notification %d marked as read", id);
      char response[] = "HTTP/1.1 200 OK\r\nContent-Type: "
                        "application/json\r\n\r\n{\"status\":\"success\"}";
      send(client_socket, response, strlen(response), 0);
      return;
    }
  }

  char response[] = "HTTP/1.1 404 Not Found\r\nContent-Type: "
                    "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"通知不存在\"}";
  send(client_socket, response, strlen(response), 0);
}

static void handle_mark_all_read(int client_socket, char *body) {
  char username[50] = "";
  parse_json_string(body, "username", username, sizeof(username));

  if (strlen(username) == 0) {
    char response[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                      "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少username\"}";
    send(client_socket, response, strlen(response), 0);
    return;
  }

  int marked = 0;
  for (int i = 0; i < notification_count; i++) {
    if (strcmp(notifications[i].username, username) == 0 &&
        !notifications[i].is_read) {
      notifications[i].is_read = 1;
      marked++;
    }
  }
  save_data();
  log_message(LOG_INFO, "Marked %d notifications as read for user %s", marked, username);

  char resp[256];
  snprintf(resp, sizeof(resp),
           "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
           "{\"status\":\"success\",\"marked\":%d}",
           marked);
  send(client_socket, resp, strlen(resp), 0);
}

static void handle_create_feedback(int client_socket, char *body) {
  Feedback new_fb;
  memset(&new_fb, 0, sizeof(Feedback));
  new_fb.id = feedback_next_id++;

  parse_json_string(body, "username", new_fb.username, sizeof(new_fb.username));
  parse_json_string(body, "category", new_fb.category, sizeof(new_fb.category));
  parse_json_string(body, "title", new_fb.title, sizeof(new_fb.title));
  parse_json_string(body, "description", new_fb.description, sizeof(new_fb.description));

  if (strlen(new_fb.username) == 0 || strlen(new_fb.title) == 0) {
    log_message(LOG_WARN, "Create feedback failed: missing fields");
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少必填字段\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  strcpy(new_fb.status, "pending");

  time_t t = time(NULL);
  struct tm *tm_info = localtime(&t);
  strftime(new_fb.created_at, sizeof(new_fb.created_at), "%Y-%m-%d %H:%M:%S", tm_info);

  if (feedback_count < MAX_FEEDBACK) {
    feedbacks[feedback_count++] = new_fb;
    save_data();
    log_message(LOG_INFO, "Feedback created: ID=%d by %s", new_fb.id, new_fb.username);
    char resp[] = "HTTP/1.1 200 OK\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"success\"}";
    send(client_socket, resp, strlen(resp), 0);
  } else {
    log_message(LOG_ERROR, "Failed to create feedback: max reached");
    char resp[] = "HTTP/1.1 500 Internal Server Error\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\"}";
    send(client_socket, resp, strlen(resp), 0);
  }
}

static void handle_get_feedback(int client_socket, char *query_string) {
  char username[50] = "";

  if (query_string) {
    char *u_ptr = strstr(query_string, "username=");
    if (u_ptr) {
      char decoded[50] = {0};
      sscanf(u_ptr + 9, "%[^& ]", decoded);
      strncpy(username, decoded, sizeof(username) - 1);
    }
  }

  char response_header[] =
      "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
      "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(MAX_FEEDBACK * 2048);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for feedbacks JSON");
    return;
  }
  memset(json, 0, MAX_FEEDBACK * 2048);
  get_feedbacks_json(json, strlen(username) > 0 ? username : NULL);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "Feedbacks fetched - user:%s",
              username[0] ? username : "all");
}

static void handle_get_stations(int client_socket) {
  char response_header[] =
      "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
      "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(8 * 1024);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for stations JSON");
    return;
  }
  memset(json, 0, 8 * 1024);
  get_stations_json(json);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "Stations fetched");
}

static void handle_get_wallet_summary(int client_socket, char *query_string) {
  char username[50] = "";

  if (query_string) {
    char *u_ptr = strstr(query_string, "username=");
    if (u_ptr) {
      char decoded[50] = {0};
      sscanf(u_ptr + 9, "%[^& ]", decoded);
      strncpy(username, decoded, sizeof(username) - 1);
    }
  }

  if (strlen(username) == 0) {
    char response[] =
        "HTTP/1.1 400 Bad Request\r\nContent-Type: "
        "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少username参数\"}";
    send(client_socket, response, strlen(response), 0);
    return;
  }

  char response_header[] =
      "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
      "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(1024);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for wallet summary");
    return;
  }
  memset(json, 0, 1024);
  get_wallet_summary_json(json, username);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "Wallet summary fetched - user:%s", username);
}

static void handle_get_wallet_txns(int client_socket, char *query_string) {
  char username[50] = "";
  char type_filter[20] = "all";
  char month[20] = "";

  if (query_string) {
    char *u_ptr = strstr(query_string, "username=");
    if (u_ptr) {
      char decoded[50] = {0};
      sscanf(u_ptr + 9, "%[^& ]", decoded);
      strncpy(username, decoded, sizeof(username) - 1);
    }
    char *t_ptr = strstr(query_string, "type=");
    if (t_ptr) {
      char decoded[20] = {0};
      sscanf(t_ptr + 5, "%[^& ]", decoded);
      if (strcmp(decoded, "income") == 0 || strcmp(decoded, "expense") == 0 ||
          strcmp(decoded, "all") == 0) {
        strncpy(type_filter, decoded, sizeof(type_filter) - 1);
      }
    }
    char *m_ptr = strstr(query_string, "month=");
    if (m_ptr) {
      char decoded[20] = {0};
      sscanf(m_ptr + 6, "%[^& ]", decoded);
      strncpy(month, decoded, sizeof(month) - 1);
    }
  }

  if (strlen(username) == 0) {
    char response[] =
        "HTTP/1.1 400 Bad Request\r\nContent-Type: "
        "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少username参数\"}";
    send(client_socket, response, strlen(response), 0);
    return;
  }

  char response_header[] =
      "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
      "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(MAX_WALLET_TXNS * 512);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for wallet txns");
    return;
  }
  memset(json, 0, MAX_WALLET_TXNS * 512);
  get_wallet_txns_json(json, username, type_filter, strlen(month) > 0 ? month : NULL);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "Wallet transactions fetched - user:%s type:%s month:%s",
              username, type_filter, month[0] ? month : "all");
}

static void handle_get_templates(int client_socket, char *query_string) {
  char creator[50] = "";

  if (query_string) {
    char *c_ptr = strstr(query_string, "creator=");
    if (c_ptr) {
      char decoded[50] = {0};
      sscanf(c_ptr + 8, "%[^& ]", decoded);
      strncpy(creator, decoded, sizeof(creator) - 1);
    }
  }

  char response_header[] =
      "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
      "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(MAX_TEMPLATES * 2048);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for templates JSON");
    return;
  }
  memset(json, 0, MAX_TEMPLATES * 2048);
  get_templates_json(json, strlen(creator) > 0 ? creator : NULL);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "Templates fetched - creator:%s",
              creator[0] ? creator : "all");
}

static void handle_create_template(int client_socket, char *body) {
  char creator[50] = "", template_name[100] = "";
  char package_info[100] = "", pickup_addr[100] = "";
  char delivery_addr[100] = "", reward[20] = "";

  parse_json_string(body, "creator", creator, sizeof(creator));
  parse_json_string(body, "templateName", template_name, sizeof(template_name));
  parse_json_string(body, "package", package_info, sizeof(package_info));
  parse_json_string(body, "pickup", pickup_addr, sizeof(pickup_addr));
  parse_json_string(body, "delivery", delivery_addr, sizeof(delivery_addr));
  parse_json_string(body, "reward", reward, sizeof(reward));

  if (strlen(creator) == 0 || strlen(template_name) == 0) {
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少必填字段\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  int id = create_template(creator, template_name, package_info,
                            pickup_addr, delivery_addr, reward);
  if (id > 0) {
    char resp[256];
    snprintf(resp, sizeof(resp),
             "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
             "{\"status\":\"success\",\"id\":%d}",
             id);
    send(client_socket, resp, strlen(resp), 0);
  } else {
    char resp[] = "HTTP/1.1 500 Internal Server Error\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"创建模板失败\"}";
    send(client_socket, resp, strlen(resp), 0);
  }
}

static void handle_update_template(int client_socket, char *body) {
  int id = parse_json_int(body, "id");
  char creator[50] = "", template_name[100] = "";
  char package_info[100] = "", pickup_addr[100] = "";
  char delivery_addr[100] = "", reward[20] = "";

  parse_json_string(body, "creator", creator, sizeof(creator));
  parse_json_string(body, "templateName", template_name, sizeof(template_name));
  parse_json_string(body, "package", package_info, sizeof(package_info));
  parse_json_string(body, "pickup", pickup_addr, sizeof(pickup_addr));
  parse_json_string(body, "delivery", delivery_addr, sizeof(delivery_addr));
  parse_json_string(body, "reward", reward, sizeof(reward));

  if (id == -1 || strlen(creator) == 0) {
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少必填字段\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  int result = update_template(id, creator,
                             strlen(template_name) > 0 ? template_name : NULL,
                             strlen(package_info) > 0 ? package_info : NULL,
                             strlen(pickup_addr) > 0 ? pickup_addr : NULL,
                             strlen(delivery_addr) > 0 ? delivery_addr : NULL,
                             strlen(reward) > 0 ? reward : NULL);

  if (result == 0) {
    char response[] = "HTTP/1.1 200 OK\r\nContent-Type: "
                      "application/json\r\n\r\n{\"status\":\"success\"}";
    send(client_socket, response, strlen(response), 0);
  } else if (result == -2) {
    char resp[] = "HTTP/1.1 403 Forbidden\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"无权限操作\"}";
    send(client_socket, resp, strlen(resp), 0);
  } else {
    char resp[] = "HTTP/1.1 404 Not Found\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"模板不存在\"}";
    send(client_socket, resp, strlen(resp), 0);
  }
}

static void handle_delete_template(int client_socket, char *body) {
  int id = parse_json_int(body, "id");
  char creator[50] = "";
  parse_json_string(body, "creator", creator, sizeof(creator));

  if (id == -1 || strlen(creator) == 0) {
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少必填字段\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  int result = delete_template(id, creator);
  if (result == 0) {
    char response[] = "HTTP/1.1 200 OK\r\nContent-Type: "
                      "application/json\r\n\r\n{\"status\":\"success\"}";
    send(client_socket, response, strlen(response), 0);
  } else if (result == -2) {
    char resp[] = "HTTP/1.1 403 Forbidden\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"无权限操作\"}";
    send(client_socket, resp, strlen(resp), 0);
  } else {
    char resp[] = "HTTP/1.1 404 Not Found\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"模板不存在\"}";
    send(client_socket, resp, strlen(resp), 0);
  }
}

static void handle_set_default_template(int client_socket, char *body) {
  int id = parse_json_int(body, "id");
  char creator[50] = "";
  parse_json_string(body, "creator", creator, sizeof(creator));

  if (id == -1 || strlen(creator) == 0) {
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少必填字段\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  set_default_template(id, creator);
  char response[] = "HTTP/1.1 200 OK\r\nContent-Type: "
                    "application/json\r\n\r\n{\"status\":\"success\"}";
  send(client_socket, response, strlen(response), 0);
}

static void handle_create_report(int client_socket, char *body) {
  char reporter[50] = "", report_type[20] = "";
  char description[1000] = "", order_id[20] = "", target_user[50] = "";

  parse_json_string(body, "reporter", reporter, sizeof(reporter));
  parse_json_string(body, "reportType", report_type, sizeof(report_type));
  parse_json_string(body, "description", description, sizeof(description));
  parse_json_string(body, "orderId", order_id, sizeof(order_id));
  parse_json_string(body, "targetUser", target_user, sizeof(target_user));

  if (strlen(reporter) == 0 || strlen(report_type) == 0) {
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少必填字段\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  int id = create_report(reporter, report_type, description,
                         strlen(order_id) > 0 ? order_id : NULL,
                         strlen(target_user) > 0 ? target_user : NULL);
  if (id > 0) {
    char resp[256];
    snprintf(resp, sizeof(resp),
             "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
             "{\"status\":\"success\",\"id\":%d}",
             id);
    send(client_socket, resp, strlen(resp), 0);
  } else {
    char resp[] = "HTTP/1.1 500 Internal Server Error\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"创建举报工单失败\"}";
    send(client_socket, resp, strlen(resp), 0);
  }
}

static void handle_get_reports(int client_socket, char *query_string) {
  char reporter[50] = "";

  if (query_string) {
    char *r_ptr = strstr(query_string, "reporter=");
    if (r_ptr) {
      char decoded[50] = {0};
      sscanf(r_ptr + 9, "%[^& ]", decoded);
      strncpy(reporter, decoded, sizeof(reporter) - 1);
    }
  }

  if (strlen(reporter) == 0) {
    char response[] =
        "HTTP/1.1 400 Bad Request\r\nContent-Type: "
        "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少reporter参数\"}";
    send(client_socket, response, strlen(response), 0);
    return;
  }

  char response_header[] =
      "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
      "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(MAX_REPORTS * 2048);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for reports JSON");
    return;
  }
  memset(json, 0, MAX_REPORTS * 2048);
  get_reports_json(json, reporter);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "Reports fetched - reporter:%s", reporter);
}

static void handle_get_all_reports(int client_socket, char *query_string) {
  char status_filter[20] = "all", type_filter[20] = "all";
  char username[50] = "";

  if (query_string) {
    char *s_ptr = strstr(query_string, "status=");
    if (s_ptr) {
      char decoded[20] = {0};
      sscanf(s_ptr + 7, "%[^& ]", decoded);
      strncpy(status_filter, decoded, sizeof(status_filter) - 1);
    }
    char *t_ptr = strstr(query_string, "type=");
    if (t_ptr) {
      char decoded[20] = {0};
      sscanf(t_ptr + 5, "%[^& ]", decoded);
      strncpy(type_filter, decoded, sizeof(type_filter) - 1);
    }
    char *u_ptr = strstr(query_string, "username=");
    if (u_ptr) {
      char decoded[50] = {0};
      sscanf(u_ptr + 9, "%[^& ]", decoded);
      strncpy(username, decoded, sizeof(username) - 1);
    }
  }

  if (strlen(username) == 0) {
    char response[] =
        "HTTP/1.1 400 Bad Request\r\nContent-Type: "
        "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少username参数\"}";
    send(client_socket, response, strlen(response), 0);
    return;
  }

  int is_admin = 0;
  for (int i = 0; i < user_count; i++) {
    if (strcmp(users[i].username, username) == 0) {
      if (strcmp(username, "admin") == 0) {
        is_admin = 1;
      }
      break;
    }
  }

  if (!is_admin) {
    char response[] =
        "HTTP/1.1 403 Forbidden\r\nContent-Type: "
        "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"无权限访问\"}";
    send(client_socket, response, strlen(response), 0);
    log_message(LOG_WARN, "Non-admin user %s tried to access all reports", username);
    return;
  }

  char response_header[] =
      "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
      "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(MAX_REPORTS * 2048);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for all reports JSON");
    return;
  }
  memset(json, 0, MAX_REPORTS * 2048);
  get_all_reports_json(json, status_filter, type_filter);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "All reports fetched by admin - status:%s type:%s",
              status_filter, type_filter);
}

static void handle_update_report(int client_socket, char *body) {
  int id = parse_json_int(body, "id");
  char username[50] = "", status[20] = "", handler_note[500] = "";

  parse_json_string(body, "username", username, sizeof(username));
  parse_json_string(body, "status", status, sizeof(status));
  parse_json_string(body, "handlerNote", handler_note, sizeof(handler_note));

  if (id == -1 || strlen(username) == 0) {
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少必填字段\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  int is_admin = 0;
  for (int i = 0; i < user_count; i++) {
    if (strcmp(users[i].username, username) == 0) {
      if (strcmp(username, "admin") == 0) {
        is_admin = 1;
      }
      break;
    }
  }

  if (!is_admin) {
    char response[] =
        "HTTP/1.1 403 Forbidden\r\nContent-Type: "
        "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"无权限操作\"}";
    send(client_socket, response, strlen(response), 0);
    log_message(LOG_WARN, "Non-admin user %s tried to update report %d", username, id);
    return;
  }

  int result = update_report_status(id,
                                    strlen(status) > 0 ? status : NULL,
                                    strlen(handler_note) > 0 ? handler_note : NULL);
  if (result == 0) {
    char response[] = "HTTP/1.1 200 OK\r\nContent-Type: "
                      "application/json\r\n\r\n{\"status\":\"success\"}";
    send(client_socket, response, strlen(response), 0);
  } else {
    char resp[] = "HTTP/1.1 404 Not Found\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"工单不存在\"}";
    send(client_socket, resp, strlen(resp), 0);
  }
}

static void handle_get_badges(int client_socket, char *query_string) {
  char username[50] = "";
  if (query_string) {
    char *u_ptr = strstr(query_string, "username=");
    if (u_ptr)
      sscanf(u_ptr + 9, "%[^& ]", username);
  }

  if (strlen(username) == 0) {
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  check_and_unlock_badges(username);

  char response_header[] = "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
                           "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(MAX_BADGE_TYPES * 512);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for badges JSON");
    return;
  }
  memset(json, 0, MAX_BADGE_TYPES * 512);
  get_badges_json(json, username);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "Badges fetched for user: %s", username);
}

static void handle_generate_share_code(int client_socket, char *body) {
  char creator[50] = "";
  int order_id = -1;

  parse_json_string(body, "creator", creator, sizeof(creator));
  char *id_ptr = strstr(body, "\"orderId\":");
  if (id_ptr) sscanf(id_ptr + 10, "%d", &order_id);

  if (strlen(creator) == 0 || order_id == -1) {
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少必填字段\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  char code[8];
  int result = generate_share_code(creator, order_id, code);

  if (result > 0) {
    char resp[512];
    snprintf(resp, sizeof(resp),
             "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
             "{\"status\":\"success\",\"code\":\"%s\",\"orderId\":%d}",
             code, order_id);
    send(client_socket, resp, strlen(resp), 0);
    log_message(LOG_INFO, "Share code generated: %s for order %d by %s", code, order_id, creator);
  } else if (result == -2) {
    char resp[] = "HTTP/1.1 403 Forbidden\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"无权限操作\"}";
    send(client_socket, resp, strlen(resp), 0);
  } else if (result == -3) {
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"仅待接单订单可生成分享口令\"}";
    send(client_socket, resp, strlen(resp), 0);
  } else {
    char resp[] = "HTTP/1.1 500 Internal Server Error\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"生成失败\"}";
    send(client_socket, resp, strlen(resp), 0);
  }
}

static void handle_verify_share_code(int client_socket, char *body) {
  char code[10] = "";
  parse_json_string(body, "code", code, sizeof(code));

  if (strlen(code) == 0) {
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"请输入口令\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  int order_id = -1;
  char message[100] = "";
  int result = verify_share_code(code, &order_id, message);

  if (result == 0) {
    char resp[512];
    snprintf(resp, sizeof(resp),
             "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
             "{\"status\":\"success\",\"orderId\":%d,\"message\":\"%s\"}",
             order_id, message);
    send(client_socket, resp, strlen(resp), 0);
    log_message(LOG_INFO, "Share code verified: %s -> order %d", code, order_id);
  } else {
    char resp[512];
    snprintf(resp, sizeof(resp),
             "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\n\r\n"
             "{\"status\":\"error\",\"message\":\"%s\"}",
             message);
    send(client_socket, resp, strlen(resp), 0);
    log_message(LOG_WARN, "Share code verification failed: %s - %s", code, message);
  }
}

static void handle_get_share_code(int client_socket, char *query_string) {
  char creator[50] = "";
  int order_id = -1;

  if (query_string) {
    char *c_ptr = strstr(query_string, "creator=");
    if (c_ptr) sscanf(c_ptr + 8, "%[^& ]", creator);
    char *o_ptr = strstr(query_string, "orderId=");
    if (o_ptr) sscanf(o_ptr + 8, "%d", &order_id);
  }

  if (strlen(creator) == 0 || order_id == -1) {
    char resp[] = "HTTP/1.1 400 Bad Request\r\nContent-Type: "
                  "application/json\r\n\r\n{\"status\":\"error\",\"message\":\"缺少参数\"}";
    send(client_socket, resp, strlen(resp), 0);
    return;
  }

  char response_header[] = "HTTP/1.1 200 OK\r\nContent-Type: application/json; "
                           "charset=UTF-8\r\n\r\n";
  send(client_socket, response_header, strlen(response_header), 0);

  char *json = malloc(1024);
  if (!json) {
    log_message(LOG_ERROR, "Failed to allocate memory for share code JSON");
    return;
  }
  memset(json, 0, 1024);
  get_share_code_by_order_json(json, order_id, creator);
  send(client_socket, json, strlen(json), 0);
  free(json);

  log_message(LOG_INFO, "Share code fetched - order:%d creator:%s", order_id, creator);
}

void handle_request(int client_socket) {
  char buffer[BUFFER_SIZE];
  memset(buffer, 0, BUFFER_SIZE);
  int bytes_read = read(client_socket, buffer, BUFFER_SIZE - 1);

  if (bytes_read <= 0) {
    close(client_socket);
    return;
  }

  // Ensure full body for POST
  if (strstr(buffer, "POST ")) {
    char *cl_ptr = strstr(buffer, "Content-Length: ");
    if (cl_ptr) {
      int clen = atoi(cl_ptr + 16);
      char *b_start = strstr(buffer, "\r\n\r\n");
      if (b_start) {
        b_start += 4;
        long current_body_len = bytes_read - (b_start - buffer);
        while (current_body_len < clen && bytes_read < BUFFER_SIZE - 1) {
          int n = read(client_socket, buffer + bytes_read,
                       BUFFER_SIZE - 1 - bytes_read);
          if (n <= 0)
            break;
          bytes_read += n;
          current_body_len += n;
        }
      }
    }
  }

  if (strstr(buffer, "GET / ") || strstr(buffer, "GET /index.html")) {
    send_file(client_socket, "frontend/index.html", "text/html; charset=UTF-8");
  } else if (strstr(buffer, "GET /style.css")) {
    send_file(client_socket, "frontend/css/style.css", "text/css");
  } else if (strstr(buffer, "GET /script.js")) {
    send_file(client_socket, "frontend/js/script.js", "application/javascript");
  } else if (strstr(buffer, "POST /api/register")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_register(client_socket, body);
    }
  } else if (strstr(buffer, "POST /api/login")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_login(client_socket, body);
    }
  } else if (strstr(buffer, "GET /api/orders")) {
    char *path_start = strstr(buffer, "GET /api/orders");
    char *q = strstr(path_start, "?");
    handle_get_orders(client_socket, q);
  } else if (strstr(buffer, "POST /api/orders")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_create_order(client_socket, body);
    }
  } else if (strstr(buffer, "POST /api/update_status")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_update_status(client_socket, body);
    }
  } else if (strstr(buffer, "POST /api/update_profile")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_update_profile(client_socket, body);
    }
  } else if (strstr(buffer, "GET /api/leaderboard")) {
    char *path_start = strstr(buffer, "GET /api/leaderboard");
    char *q = strstr(path_start, "?");
    handle_get_leaderboard(client_socket, q);
  } else if (strstr(buffer, "GET /api/runner_detail")) {
    char *path_start = strstr(buffer, "GET /api/runner_detail");
    char *q = strstr(path_start, "?");
    handle_get_runner_detail(client_socket, q);
  } else if (strstr(buffer, "GET /api/lostfound")) {
    char *path_start = strstr(buffer, "GET /api/lostfound");
    char *q = strstr(path_start, "?");
    handle_get_lostfound(client_socket, q);
  } else if (strstr(buffer, "POST /api/lostfound")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_create_lostfound(client_socket, body);
    }
  } else if (strstr(buffer, "POST /api/lostfound_update")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_update_lostfound(client_socket, body);
    }
  } else if (strstr(buffer, "POST /api/lostfound_offline")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_offline_lostfound(client_socket, body);
    }
  } else if (strstr(buffer, "GET /api/notifications")) {
    char *path_start = strstr(buffer, "GET /api/notifications");
    char *q = strstr(path_start, "?");
    handle_get_notifications(client_socket, q);
  } else if (strstr(buffer, "GET /api/unread_count")) {
    char *path_start = strstr(buffer, "GET /api/unread_count");
    char *q = strstr(path_start, "?");
    handle_get_unread_count(client_socket, q);
  } else if (strstr(buffer, "POST /api/mark_read")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_mark_read(client_socket, body);
    }
  } else if (strstr(buffer, "POST /api/mark_all_read")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_mark_all_read(client_socket, body);
    }
  } else if (strstr(buffer, "POST /api/feedback")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_create_feedback(client_socket, body);
    }
  } else if (strstr(buffer, "GET /api/feedback")) {
    char *path_start = strstr(buffer, "GET /api/feedback");
    char *q = strstr(path_start, "?");
    handle_get_feedback(client_socket, q);
  } else if (strstr(buffer, "GET /api/stations")) {
    handle_get_stations(client_socket);
  } else if (strstr(buffer, "GET /api/wallet/summary")) {
    char *path_start = strstr(buffer, "GET /api/wallet/summary");
    char *q = strstr(path_start, "?");
    handle_get_wallet_summary(client_socket, q);
  } else if (strstr(buffer, "GET /api/wallet/transactions")) {
    char *path_start = strstr(buffer, "GET /api/wallet/transactions");
    char *q = strstr(path_start, "?");
    handle_get_wallet_txns(client_socket, q);
  } else if (strstr(buffer, "GET /api/templates")) {
    char *path_start = strstr(buffer, "GET /api/templates");
    char *q = strstr(path_start, "?");
    handle_get_templates(client_socket, q);
  } else if (strstr(buffer, "POST /api/templates")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_create_template(client_socket, body);
    }
  } else if (strstr(buffer, "POST /api/templates_update")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_update_template(client_socket, body);
    }
  } else if (strstr(buffer, "POST /api/templates_delete")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_delete_template(client_socket, body);
    }
  } else if (strstr(buffer, "POST /api/templates_default")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_set_default_template(client_socket, body);
    }
  } else if (strstr(buffer, "POST /api/reports")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_create_report(client_socket, body);
    }
  } else if (strstr(buffer, "GET /api/reports")) {
    char *path_start = strstr(buffer, "GET /api/reports");
    char *q = strstr(path_start, "?");
    handle_get_reports(client_socket, q);
  } else if (strstr(buffer, "GET /api/reports/all")) {
    char *path_start = strstr(buffer, "GET /api/reports/all");
    char *q = strstr(path_start, "?");
    handle_get_all_reports(client_socket, q);
  } else if (strstr(buffer, "POST /api/reports_update")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_update_report(client_socket, body);
    }
  } else if (strstr(buffer, "GET /api/badges")) {
    char *path_start = strstr(buffer, "GET /api/badges");
    char *q = strstr(path_start, "?");
    handle_get_badges(client_socket, q);
  } else if (strstr(buffer, "POST /api/share_code/generate")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_generate_share_code(client_socket, body);
    }
  } else if (strstr(buffer, "POST /api/share_code/verify")) {
    char *body = strstr(buffer, "\r\n\r\n");
    if (body) {
      body += 4;
      handle_verify_share_code(client_socket, body);
    }
  } else if (strstr(buffer, "GET /api/share_code")) {
    char *path_start = strstr(buffer, "GET /api/share_code");
    char *q = strstr(path_start, "?");
    handle_get_share_code(client_socket, q);
  } else {
    log_message(LOG_WARN, "404 Not Found: %.50s", buffer);
    char response[] = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
    send(client_socket, response, strlen(response), 0);
  }

  close(client_socket);
}
