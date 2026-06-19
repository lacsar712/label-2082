#ifndef DATABASE_H
#define DATABASE_H

#include "types.h"

extern User users[MAX_USERS];
extern int user_count;
extern Order orders[MAX_ORDERS];
extern int order_count;
extern int next_id;
extern LostFound lostfound_list[MAX_LOSTFOUND];
extern int lostfound_count;
extern int lostfound_next_id;
extern Notification notifications[MAX_NOTIFICATIONS];
extern int notification_count;
extern int notification_next_id;
extern Feedback feedbacks[MAX_FEEDBACK];
extern int feedback_count;
extern int feedback_next_id;

void save_data();
void load_data();
const char* get_user_real_name(const char *username);
void create_notification(const char *username, const char *type, const char *title, const char *summary, const char *related_id);
void get_feedbacks_json(char *json, const char *username);

#endif
