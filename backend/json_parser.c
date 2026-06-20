#include "json_parser.h"
#include "database.h"
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

void url_decode(char *dst, const char *src) {
  char a, b;
  while (*src) {
    if ((*src == '%') && ((a = src[1]) && (b = src[2])) &&
        (isxdigit(a) && isxdigit(b))) {
      if (a >= 'a')
        a -= 'a' - 'A';
      if (a >= 'A')
        a -= ('A' - 10);
      else
        a -= '0';
      if (b >= 'a')
        b -= 'a' - 'A';
      if (b >= 'A')
        b -= ('A' - 10);
      else
        b -= '0';
      *dst++ = 16 * a + b;
      src += 3;
    } else if (*src == '+') {
      *dst++ = ' ';
      src++;
    } else {
      *dst++ = *src++;
    }
  }
  *dst = '\0';
}

void parse_json_string(const char *body, const char *key, char *output, int max_len) {
  char search[100];
  snprintf(search, sizeof(search), "\"%s\"", key);
  char *p = strstr(body, search);
  if (p) {
    p += strlen(search);
    while (*p == ' ' || *p == ':' || *p == '"')
      p++;
    int i = 0;
    while (*p && *p != '"' && i < max_len - 1)
      output[i++] = *p++;
    output[i] = '\0';
  }
}

int parse_json_int(const char *body, const char *key) {
  char search[100];
  snprintf(search, sizeof(search), "\"%s\"", key);
  char *p = strstr(body, search);
  if (p) {
    p += strlen(search);
    while (*p == ' ' || *p == ':')
      p++;
    return atoi(p);
  }
  return -1;
}

static int parse_date(const char *date_str, struct tm *tm_out) {
  if (strlen(date_str) == 0)
    return 0;
  if (sscanf(date_str, "%d-%d-%d %d:%d:%d", &tm_out->tm_year, &tm_out->tm_mon,
             &tm_out->tm_mday, &tm_out->tm_hour, &tm_out->tm_min,
             &tm_out->tm_sec) != 6)
    return 0;
  tm_out->tm_year -= 1900;
  tm_out->tm_mon -= 1;
  return 1;
}

static int is_within_days(const char *date_str, int days) {
  struct tm tm_order;
  if (!parse_date(date_str, &tm_order))
    return 0;
  time_t t_order = mktime(&tm_order);
  time_t t_now = time(NULL);
  double diff = difftime(t_now, t_order);
  return (diff >= 0 && diff <= days * 86400.0);
}

static int is_within_week(const char *date_str) {
  return is_within_days(date_str, 7);
}

static int is_within_month(const char *date_str) {
  return is_within_days(date_str, 30);
}

void get_orders_json(char *buf, const char *creator_filter,
                     const char *worker_filter, const char *category_filter) {
  strcat(buf, "[");
  int first = 1;
  char dec_cat[100] = {0};
  if (category_filter && strlen(category_filter) > 0) {
    url_decode(dec_cat, category_filter);
  }

  for (int i = 0; i < order_count; i++) {
    if (creator_filter && strlen(creator_filter) > 0 &&
        strcmp(orders[i].creator, creator_filter) != 0)
      continue;
    if (worker_filter && strlen(worker_filter) > 0 &&
        strcmp(orders[i].worker, worker_filter) != 0)
      continue;
    if (strlen(dec_cat) > 0 && strcmp(dec_cat, "全部") != 0 &&
        strstr(orders[i].category, dec_cat) == NULL &&
        strstr(orders[i].pickup_addr, dec_cat) == NULL)
      continue;

    if (!first)
      strcat(buf, ",");
    char item[1024];
    sprintf(item,
            "{\"id\":%d,\"creator\":\"%s\",\"worker\":\"%s\",\"package\":\"%"
            "s\",\"pickup\":\"%s\",\"delivery\":\"%s\",\"reward\":\"%s\","
            "\"category\":\"%s\",\"status\":\"%s\",\"createdAt\":\"%s\","
            "\"rating\":%d}",
            orders[i].id, orders[i].creator,
            (strlen(orders[i].worker) > 0 ? orders[i].worker : ""),
            orders[i].package_info, orders[i].pickup_addr,
            orders[i].delivery_addr, orders[i].reward, orders[i].category,
            orders[i].status, orders[i].created_at, orders[i].rating);
    strcat(buf, item);
    first = 0;
  }
  strcat(buf, "]");
}

typedef struct {
  char username[50];
  char real_name[50];
  char major[50];
  int total_orders;
  int total_rating;
  int rated_orders;
  int week_orders;
  int month_orders;
} RunnerStats;

static void init_runner_stats(RunnerStats *rs, const char *username,
                               const char *real_name, const char *major) {
  memset(rs, 0, sizeof(RunnerStats));
  strncpy(rs->username, username, sizeof(rs->username) - 1);
  rs->username[sizeof(rs->username) - 1] = '\0';
  strncpy(rs->real_name, real_name, sizeof(rs->real_name) - 1);
  rs->real_name[sizeof(rs->real_name) - 1] = '\0';
  strncpy(rs->major, major, sizeof(rs->major) - 1);
  rs->major[sizeof(rs->major) - 1] = '\0';
  rs->total_orders = 0;
  rs->total_rating = 0;
  rs->rated_orders = 0;
  rs->week_orders = 0;
  rs->month_orders = 0;
}

static int find_runner(RunnerStats stats[], int count, const char *username) {
  for (int i = 0; i < count; i++) {
    if (strcmp(stats[i].username, username) == 0)
      return i;
  }
  return -1;
}

static int compare_runners(const void *a, const void *b, const char *period) {
  RunnerStats *ra = (RunnerStats *)a;
  RunnerStats *rb = (RunnerStats *)b;
  int a_orders, b_orders;
  if (strcmp(period, "week") == 0) {
    a_orders = ra->week_orders;
    b_orders = rb->week_orders;
  } else if (strcmp(period, "month") == 0) {
    a_orders = ra->month_orders;
    b_orders = rb->month_orders;
  } else {
    a_orders = ra->total_orders;
    b_orders = rb->total_orders;
  }
  if (b_orders != a_orders)
    return b_orders - a_orders;
  float a_rate = ra->rated_orders > 0 ? (float)ra->total_rating / ra->rated_orders : 0;
  float b_rate = rb->rated_orders > 0 ? (float)rb->total_rating / rb->rated_orders : 0;
  return (b_rate > a_rate) ? 1 : (b_rate < a_rate) ? -1 : 0;
}

static int sort_week(const void *a, const void *b) {
  return compare_runners(a, b, "week");
}

static int sort_month(const void *a, const void *b) {
  return compare_runners(a, b, "month");
}

static int sort_total(const void *a, const void *b) {
  return compare_runners(a, b, "total");
}

void get_leaderboard_json(char *buf, const char *period) {
  RunnerStats stats[MAX_USERS];
  int runner_count = 0;

  for (int i = 0; i < order_count; i++) {
    if (strlen(orders[i].worker) == 0)
      continue;
    if (strcmp(orders[i].status, "completed") != 0)
      continue;

    int idx = find_runner(stats, runner_count, orders[i].worker);
    if (idx == -1) {
      char real_name[50] = "", major[50] = "";
      for (int j = 0; j < user_count; j++) {
        if (strcmp(users[j].username, orders[i].worker) == 0) {
          strncpy(real_name, users[j].real_name, sizeof(real_name) - 1);
          strncpy(major, users[j].major, sizeof(major) - 1);
          break;
        }
      }
      if (strlen(real_name) == 0)
        strncpy(real_name, orders[i].worker, sizeof(real_name) - 1);
      init_runner_stats(&stats[runner_count], orders[i].worker, real_name,
                        major);
      idx = runner_count++;
    }

    stats[idx].total_orders++;
    if (orders[i].rating > 0) {
      stats[idx].total_rating += orders[i].rating;
      stats[idx].rated_orders++;
    }
    if (is_within_week(orders[i].created_at))
      stats[idx].week_orders++;
    if (is_within_month(orders[i].created_at))
      stats[idx].month_orders++;
  }

  if (strcmp(period, "week") == 0)
    qsort(stats, runner_count, sizeof(RunnerStats), sort_week);
  else if (strcmp(period, "month") == 0)
    qsort(stats, runner_count, sizeof(RunnerStats), sort_month);
  else
    qsort(stats, runner_count, sizeof(RunnerStats), sort_total);

  strcat(buf, "[");
  int rank_counter = 0;
  for (int i = 0; i < runner_count; i++) {
    int display_orders;
    if (strcmp(period, "week") == 0)
      display_orders = stats[i].week_orders;
    else if (strcmp(period, "month") == 0)
      display_orders = stats[i].month_orders;
    else
      display_orders = stats[i].total_orders;

    if (display_orders == 0)
      continue;

    rank_counter++;
    if (rank_counter > 1)
      strcat(buf, ",");
    float avg_rating = stats[i].rated_orders > 0
                           ? (float)stats[i].total_rating / stats[i].rated_orders
                           : 5.0f;
    if (avg_rating > 5.0f)
      avg_rating = 5.0f;
    float good_rate = (avg_rating / 5.0f) * 100.0f;

    char item[1024];
    sprintf(item,
            "{\"rank\":%d,\"username\":\"%s\",\"nickname\":\"%s\","
            "\"major\":\"%s\",\"totalOrders\":%d,\"goodRate\":%.1f,"
            "\"weekActivity\":%d}",
            rank_counter, stats[i].username, stats[i].real_name, stats[i].major,
            display_orders, good_rate, stats[i].week_orders);
    strcat(buf, item);
  }
  strcat(buf, "]");
}

void get_runner_detail_json(char *buf, const char *username) {
  char real_name[50] = "", major[50] = "";
  int found = 0;
  for (int i = 0; i < user_count; i++) {
    if (strcmp(users[i].username, username) == 0) {
      strncpy(real_name, users[i].real_name, sizeof(real_name) - 1);
      strncpy(major, users[i].major, sizeof(major) - 1);
      found = 1;
      break;
    }
  }
  if (!found)
    strncpy(real_name, username, sizeof(real_name) - 1);

  int total_orders = 0;
  int total_rating = 0;
  int rated_orders = 0;
  int week_orders = 0;

  int recent_indices[20];
  int recent_count = 0;

  for (int i = order_count - 1; i >= 0 && recent_count < 20; i--) {
    if (strcmp(orders[i].worker, username) != 0)
      continue;
    if (strcmp(orders[i].status, "completed") != 0)
      continue;
    recent_indices[recent_count++] = i;
  }

  for (int i = 0; i < order_count; i++) {
    if (strcmp(orders[i].worker, username) != 0)
      continue;
    if (strcmp(orders[i].status, "completed") != 0)
      continue;
    total_orders++;
    if (orders[i].rating > 0) {
      total_rating += orders[i].rating;
      rated_orders++;
    }
    if (is_within_week(orders[i].created_at))
      week_orders++;
  }

  float avg_rating = rated_orders > 0 ? (float)total_rating / rated_orders : 5.0f;
  if (avg_rating > 5.0f)
    avg_rating = 5.0f;
  float good_rate = (avg_rating / 5.0f) * 100.0f;

  sprintf(buf,
          "{\"username\":\"%s\",\"nickname\":\"%s\",\"major\":\"%s\","
          "\"totalOrders\":%d,\"goodRate\":%.1f,\"weekActivity\":%d,"
          "\"recentOrders\":[",
          username, real_name, major, total_orders, good_rate, week_orders);

  int first = 1;
  for (int i = 0; i < recent_count; i++) {
    if (!first)
      strcat(buf, ",");
    int idx = recent_indices[i];
    char item[512];
    sprintf(item,
            "{\"id\":%d,\"package\":\"%s\",\"pickup\":\"%s\","
            "\"delivery\":\"%s\",\"reward\":\"%s\",\"createdAt\":\"%s\","
            "\"rating\":%d}",
            orders[idx].id, orders[idx].package_info, orders[idx].pickup_addr,
            orders[idx].delivery_addr, orders[idx].reward,
            orders[idx].created_at, orders[idx].rating);
    strcat(buf, item);
    first = 0;
  }
  strcat(buf, "]}");
}

static void escape_json_string(char *dst, const char *src, int max_len) {
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

typedef struct {
  int index;
  char created_at[32];
} LFSortItem;

static int compare_lf_desc(const void *a, const void *b) {
  const LFSortItem *ia = (const LFSortItem *)a;
  const LFSortItem *ib = (const LFSortItem *)b;
  return strcmp(ib->created_at, ia->created_at);
}

static int compare_lf_asc(const void *a, const void *b) {
  const LFSortItem *ia = (const LFSortItem *)a;
  const LFSortItem *ib = (const LFSortItem *)b;
  return strcmp(ia->created_at, ib->created_at);
}

void get_lostfound_json(char *buf, const char *type_filter, const char *category_filter,
                        const char *keyword, const char *sort_order, const char *creator_filter) {
  char dec_type[20] = {0}, dec_cat[100] = {0}, dec_kw[200] = {0}, dec_creator[50] = {0};

  if (type_filter && strlen(type_filter) > 0)
    url_decode(dec_type, type_filter);
  if (category_filter && strlen(category_filter) > 0)
    url_decode(dec_cat, category_filter);
  if (keyword && strlen(keyword) > 0)
    url_decode(dec_kw, keyword);
  if (creator_filter && strlen(creator_filter) > 0)
    url_decode(dec_creator, creator_filter);

  int matched[MAX_LOSTFOUND];
  int match_count = 0;

  for (int i = 0; i < lostfound_count; i++) {
    if (strcmp(lostfound_list[i].status, "offline") == 0)
      continue;

    if (strlen(dec_type) > 0 && strcmp(dec_type, "全部") != 0 &&
        strcmp(lostfound_list[i].type, dec_type) != 0)
      continue;

    if (strlen(dec_cat) > 0 && strcmp(dec_cat, "全部") != 0 &&
        strcmp(lostfound_list[i].category, dec_cat) != 0)
      continue;

    if (strlen(dec_creator) > 0 &&
        strcmp(lostfound_list[i].creator, dec_creator) != 0)
      continue;

    if (strlen(dec_kw) > 0) {
      if (strstr(lostfound_list[i].title, dec_kw) == NULL &&
          strstr(lostfound_list[i].description, dec_kw) == NULL &&
          strstr(lostfound_list[i].location, dec_kw) == NULL &&
          strstr(lostfound_list[i].category, dec_kw) == NULL)
        continue;
    }

    matched[match_count++] = i;
  }

  LFSortItem sort_items[MAX_LOSTFOUND];
  for (int i = 0; i < match_count; i++) {
    sort_items[i].index = matched[i];
    strcpy(sort_items[i].created_at, lostfound_list[matched[i]].created_at);
  }

  if (sort_order && strcmp(sort_order, "asc") == 0)
    qsort(sort_items, match_count, sizeof(LFSortItem), compare_lf_asc);
  else
    qsort(sort_items, match_count, sizeof(LFSortItem), compare_lf_desc);

  strcat(buf, "[");
  for (int i = 0; i < match_count; i++) {
    if (i > 0)
      strcat(buf, ",");
    int idx = sort_items[i].index;
    LostFound *lf = &lostfound_list[idx];

    char esc_title[200], esc_desc[1000], esc_loc[200], esc_contact[100], esc_cat[100];
    escape_json_string(esc_title, lf->title, sizeof(esc_title));
    escape_json_string(esc_desc, lf->description, sizeof(esc_desc));
    escape_json_string(esc_loc, lf->location, sizeof(esc_loc));
    escape_json_string(esc_contact, lf->contact, sizeof(esc_contact));
    escape_json_string(esc_cat, lf->category, sizeof(esc_cat));

    char item[2048];
    sprintf(item,
            "{\"id\":%d,\"type\":\"%s\",\"title\":\"%s\",\"description\":\"%s\","
            "\"location\":\"%s\",\"contact\":\"%s\",\"category\":\"%s\","
            "\"creator\":\"%s\",\"creatorName\":\"%s\",\"status\":\"%s\","
            "\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}",
            lf->id, lf->type, esc_title, esc_desc, esc_loc, esc_contact,
            esc_cat, lf->creator, lf->creator_name, lf->status,
            lf->created_at, lf->updated_at);
    strcat(buf, item);
  }
  strcat(buf, "]");
}

typedef struct {
  int index;
  char created_at[32];
} NotifSortItem;

static int compare_notif_desc(const void *a, const void *b) {
  const NotifSortItem *ia = (const NotifSortItem *)a;
  const NotifSortItem *ib = (const NotifSortItem *)b;
  return strcmp(ib->created_at, ia->created_at);
}

void get_notifications_json(char *buf, const char *username, int unread_only) {
  char dec_user[50] = {0};
  if (username && strlen(username) > 0)
    url_decode(dec_user, username);

  int matched[MAX_NOTIFICATIONS];
  int match_count = 0;

  for (int i = 0; i < notification_count; i++) {
    if (strlen(dec_user) > 0 &&
        strcmp(notifications[i].username, dec_user) != 0)
      continue;
    if (unread_only && notifications[i].is_read)
      continue;
    matched[match_count++] = i;
  }

  NotifSortItem sort_items[MAX_NOTIFICATIONS];
  for (int i = 0; i < match_count; i++) {
    sort_items[i].index = matched[i];
    strcpy(sort_items[i].created_at, notifications[matched[i]].created_at);
  }
  qsort(sort_items, match_count, sizeof(NotifSortItem), compare_notif_desc);

  strcat(buf, "[");
  for (int i = 0; i < match_count; i++) {
    if (i > 0)
      strcat(buf, ",");
    int idx = sort_items[i].index;
    Notification *n = &notifications[idx];

    char esc_title[200], esc_summary[600];
    escape_json_string(esc_title, n->title, sizeof(esc_title));
    escape_json_string(esc_summary, n->summary, sizeof(esc_summary));

    char item[1024];
    sprintf(item,
            "{\"id\":%d,\"username\":\"%s\",\"type\":\"%s\",\"title\":\"%s\","
            "\"summary\":\"%s\",\"relatedId\":\"%s\",\"isRead\":%d,"
            "\"createdAt\":\"%s\"}",
            n->id, n->username, n->type, esc_title, esc_summary,
            n->related_id, n->is_read, n->created_at);
    strcat(buf, item);
  }
  strcat(buf, "]");
}

int get_unread_notification_count(const char *username) {
  if (!username || strlen(username) == 0) return 0;
  int count = 0;
  for (int i = 0; i < notification_count; i++) {
    if (strcmp(notifications[i].username, username) == 0 &&
        !notifications[i].is_read) {
      count++;
    }
  }
  return count;
}
