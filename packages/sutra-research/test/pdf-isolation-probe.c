/* Test-only native probe of the exact parser isolation envelope. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <sched.h>
#include <sys/stat.h>
#include <sys/resource.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <net/if.h>
static void check(int ok,const char *name) {
 if(!ok){fprintf(stderr,"isolation failed: %s\n",name);exit(1);}
}
static void limit(int resource,rlim_t max,const char *name){
 struct rlimit r;check(getrlimit(resource,&r)==0 && r.rlim_cur<=max && r.rlim_max<=max,name);
}
int main(int argc,char **argv){
 check(argc==4,"args");struct stat s;
 check(stat("/proc/self/ns/net",&s)==0 && (unsigned long long)s.st_ino!=strtoull(argv[1],NULL,10),"network namespace");
 check(stat("/proc/self/ns/pid",&s)==0 && (unsigned long long)s.st_ino!=strtoull(argv[2],NULL,10),"PID namespace");
 check(access("/tmp/sutra-pdf-ci/host-canary",F_OK)!=0,"host path hidden");
 check(getenv("SUTRA_PDF_SECRET_CANARY")==NULL,"environment cleared");
 FILE *status=fopen("/proc/self/status","r");check(status!=NULL,"proc status");
 char line[256];int caps=0,nnp=0;
 while(fgets(line,sizeof line,status)){
  if(!strncmp(line,"CapEff:",7))caps=strtoull(line+7,NULL,16)==0;
  if(!strncmp(line,"NoNewPrivs:",11))nnp=atoi(line+11)==1;
 }
 fclose(status);check(caps,"effective caps zero");check(nnp,"no new privileges");
 limit(RLIMIT_AS,268435456,"address space");limit(RLIMIT_CPU,5,"CPU");limit(RLIMIT_FSIZE,1048576,"file size");limit(RLIMIT_NOFILE,64,"file descriptors");limit(RLIMIT_NPROC,32,"process count");
 struct if_nameindex *interfaces=if_nameindex();check(interfaces!=NULL,"network interfaces");
 for(struct if_nameindex *i=interfaces;i->if_index;i++)check(!strcmp(i->if_name,"lo"),"no external interface");
 if_freenameindex(interfaces);
 int fd=socket(AF_INET,SOCK_STREAM|SOCK_CLOEXEC,0);
 if(fd>=0){struct sockaddr_in addr={.sin_family=AF_INET,.sin_port=htons((unsigned short)atoi(argv[3])),.sin_addr.s_addr=htonl(INADDR_LOOPBACK)};
 check(connect(fd,(struct sockaddr*)&addr,sizeof(addr))==-1,"host listener unreachable");close(fd);}
 else check(errno==EPERM||errno==EACCES,"socket denied");
 check(unshare(CLONE_NEWUSER)==-1,"nested user namespace disabled");
 puts("SUTRA_ISOLATION_PROBE_OK");return 0;
}
