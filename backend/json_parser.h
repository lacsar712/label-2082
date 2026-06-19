#ifndef JSON_PARSER_H
#define JSON_PARSER_H

#include "types.h"

void url_decode(char *dst, const char *src);
void parse_json_string(const char *body, const char *key, char *output, int max_len);
int parse_json_int(const char *body, const char *key);
void get_orders_json(char *buf, const char *creator_filter, const char *worker_filter, const char *category_filter);
void get_leaderboard_json(char *buf, const char *period);
void get_runner_detail_json(char *buf, const char *username);
void get_lostfound_json(char *buf, const char *type_filter, const char *category_filter,
                        const char *keyword, const char *sort_order, const char *creator_filter);
void get_notifications_json(char *buf, const char *username, int unread_only);
int get_unread_notification_count(const char *username);

#endif
