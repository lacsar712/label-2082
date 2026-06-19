#ifndef TYPES_H
#define TYPES_H

#define MAX_ORDERS 500
#define MAX_USERS 100
#define MAX_LOSTFOUND 500
#define MAX_NOTIFICATIONS 2000
#define MAX_FEEDBACK 500
#define MAX_WALLET_TXNS 2000
#define MAX_TEMPLATES 100
#define MAX_REPORTS 500
#define MAX_BADGES 1000
#define MAX_BADGE_TYPES 20
#define BUFFER_SIZE 20480

typedef struct {
  char username[50];
  char password[50];
  char real_name[50];
  char major[50];
  double balance;
} User;

typedef struct {
  int id;
  char username[50];
  char type[10];
  double amount;
  char description[200];
  char order_id[20];
  char remark[100];
  char created_at[32];
} WalletTransaction;

typedef struct {
  int id;
  char creator[50];
  char worker[50];
  char package_info[100];
  char pickup_addr[100];
  char delivery_addr[100];
  char reward[20];
  char category[50];
  char status[20];
  char created_at[32];
  int rating;
  int use_balance_deduction;
} Order;

typedef struct {
  int id;
  char type[10];
  char title[100];
  char description[500];
  char location[100];
  char contact[50];
  char category[50];
  char creator[50];
  char creator_name[50];
  char status[20];
  char created_at[32];
  char updated_at[32];
} LostFound;

typedef struct {
  int id;
  char username[50];
  char type[30];
  char title[100];
  char summary[300];
  char related_id[20];
  int is_read;
  char created_at[32];
} Notification;

typedef struct {
  int id;
  char username[50];
  char category[50];
  char title[100];
  char description[1000];
  char status[20];
  char created_at[32];
} Feedback;

typedef struct {
  int id;
  char creator[50];
  char template_name[100];
  char package_info[100];
  char pickup_addr[100];
  char delivery_addr[100];
  char reward[20];
  int is_default;
  char created_at[32];
  char updated_at[32];
} TaskTemplate;

typedef struct {
  int id;
  char reporter[50];
  char report_type[20];
  char description[1000];
  char order_id[20];
  char target_user[50];
  char status[20];
  char handler_note[500];
  char created_at[32];
  char updated_at[32];
  char handled_at[32];
} Report;

typedef struct {
  int id;
  char username[50];
  char badge_key[50];
  char unlocked_at[32];
} Badge;

#endif
