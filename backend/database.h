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
extern Report reports[MAX_REPORTS];
extern int report_count;
extern int report_next_id;
extern Badge badges[MAX_BADGES];
extern int badge_count;
extern int badge_next_id;
extern ShareCode share_codes[MAX_SHARE_CODES];
extern int share_code_count;
extern int share_code_next_id;

void save_data();
void load_data();
const char* get_user_real_name(const char *username);
void create_notification(const char *username, const char *type, const char *title, const char *summary, const char *related_id);
void get_feedbacks_json(char *json, const char *username);
void get_stations_json(char *json, const char *exclude_user);
int add_wallet_transaction(const char *username, const char *type, double amount, const char *description, const char *order_id, const char *remark);
int record_wallet_transaction(const char *username, const char *type, double amount, const char *description, const char *order_id, const char *remark);
void get_wallet_txns_json(char *json, const char *username, const char *type_filter, const char *month);
void get_wallet_summary_json(char *json, const char *username);
double get_user_balance(const char *username);
int wallet_recharge(const char *username, double amount, const char *method);
int wallet_withdraw(const char *username, double amount, const char *method);
int pre_deduct_balance(const char *username, double amount, const char *description, const char *order_id);
int refund_pre_deducted(const char *username, double amount, const char *description, const char *order_id);

void get_templates_json(char *json, const char *creator);
int create_template(const char *creator, const char *template_name, const char *package_info,
                    const char *pickup_addr, const char *delivery_addr, const char *reward);
int update_template(int id, const char *creator, const char *template_name, const char *package_info,
                    const char *pickup_addr, const char *delivery_addr, const char *reward);
int delete_template(int id, const char *creator);
int set_default_template(int id, const char *creator);

void get_reports_json(char *json, const char *reporter);
void get_all_reports_json(char *json, const char *status_filter, const char *type_filter);
int create_report(const char *reporter, const char *report_type, const char *description,
                  const char *order_id, const char *target_user);
int update_report_status(int id, const char *status, const char *handler_note);
Report* find_report_by_id(int id);

void check_and_unlock_badges(const char *username);
void get_badges_json(char *json, const char *username);

int generate_share_code(const char *creator, int order_id, char *out_code);
int verify_share_code(const char *code, int *out_order_id, char *out_message);
void get_share_code_by_order_json(char *json, int order_id, const char *creator);
void cleanup_expired_share_codes();

#endif
