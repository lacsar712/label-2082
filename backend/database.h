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
extern WalletTransaction wallet_txns[MAX_WALLET_TXNS];
extern int wallet_txn_count;
extern int wallet_txn_next_id;
extern TaskTemplate templates[MAX_TEMPLATES];
extern int template_count;
extern int template_next_id;

void save_data();
void load_data();
const char* get_user_real_name(const char *username);
void create_notification(const char *username, const char *type, const char *title, const char *summary, const char *related_id);
void get_feedbacks_json(char *json, const char *username);
void get_stations_json(char *json);
int add_wallet_transaction(const char *username, const char *type, double amount, const char *description, const char *order_id, const char *remark);
int record_wallet_transaction(const char *username, const char *type, double amount, const char *description, const char *order_id, const char *remark);
void get_wallet_txns_json(char *json, const char *username, const char *type_filter, const char *month);
void get_wallet_summary_json(char *json, const char *username);
double get_user_balance(const char *username);

void get_templates_json(char *json, const char *creator);
int create_template(const char *creator, const char *template_name, const char *package_info,
                    const char *pickup_addr, const char *delivery_addr, const char *reward);
int update_template(int id, const char *creator, const char *template_name, const char *package_info,
                    const char *pickup_addr, const char *delivery_addr, const char *reward);
int delete_template(int id, const char *creator);
int set_default_template(int id, const char *creator);

#endif
