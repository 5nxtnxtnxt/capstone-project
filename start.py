import socket
import subprocess
import os
import time
from _thread import *


# 서버 IP 및 열어줄 포트
HOST = '127.0.0.1'
PORT = 7777

ai_status = False
node_status = False
# 서버 소켓 생성
print('\n================================\n')
print('>>Management Server Starting...')
server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server_socket.bind((HOST, PORT))
server_socket.listen()
print('>>Management Port Open!')

socket_list = list()
node_pid = 0
while True:
    print('\n================================\n')
    print('AI STATUS :'+ str(ai_status) + ', NodeJs Status :'+ str(node_status))
    print('\nO: Open AI Socket, C: Close AI Socket\nN: NodeJs Start, S: Stop NodeJs\nE: Exit\n')
    cs = input('>>MSS Console : ')
    if cs == 'O':
        
        if ai_status == True:
            print('Error!!! AI Socket already opend!!!')
            continue

        print('\n================================\n')
        print('>>AI Socket Opening...')
        for i in range(0,5):
            print('\n================================\n')
            print('>> Wait...',i*20,'%')
            command = 'python3 ./yolov5/server_model.py --weights ./yolov5/weights/'+str(i)+'.pt --plant-code '+str(i)
            proc = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE)
            #proc = subprocess.Popen(command, shell=True)
            client_socket, addr = server_socket.accept()
            data = client_socket.recv(1024)
            data = data.decode()
            data_list = data.split()
            print(data)
            if data_list[0] == 'done':
                print('>>AI Socket Ready!!',data)
                socket_list.append(data_list[1])
            else:
                print('>>Failed open AI Socket...', i)
                for j in socket_list:
                    print(os.system('kill -9 '+j))
                break
        ai_status = True
        print('\n================================\n')
        print('AI Socket Open SUCCESS!!!')
    if cs == 'N':

        if node_status == True:
            print('Error!!! NodeJs is already working!!!')
            continue
        print('\n================================\n')
        print('>>NodeJs Opening...')
        print('\n================================\n')
        proc = subprocess.Popen(['node','nods/serv.js'], stdout=subprocess.PIPE)

        while proc.poll() == None:
            out = proc.stdout.readline()
            out = out.decode()
            if out == 'nodejsdone\n':
                node_pid = proc.pid
                print('NodeJs Open SUCCESS!!!!!!! pid :',node_pid)
                node_status = True
                break
        
    if cs == 'C':

        if ai_status == False:
            print('Error!!! AI Socket already closed!!!')
            continue

        print('\n================================\n')
        for i in socket_list:
            if os.system('kill -9 '+i) == 0 :
                print('pid: '+i)
                time.sleep(1)
            else :
                print('kill error!! pid: '+i)
            print('\n================================\n')
        ai_status = False
        print('AI Socket Closed!!!')
    if cs == 'S':
        if node_status == False:
            print('Error!!! NodeJs is already STOPPED!!!')
            continue
        print('\n================================\n')
        pidtmp = os.system('kill -9 '+ str(node_pid))
        if pidtmp == 0:
            print('pid '+ str(node_pid))
            time.sleep(1)
        else :
            print('kill error!! pid: '+str(node_pid))
            print('\n================================\n')
        node_status = False
        print('Node Stop SUCCESS!!!')
    if cs == 'E' :
        if ai_status == True:
            print('Error!!! Please Close AI Socket First!!! (Command : C)')
            continue
        if node_status == True:
            print('Error!!! Please Stop Nodejs First!!! (Command : S)')
            continue
        print('\n================================\n')
        print('GOOD BYE!!!')
        print('\n================================\n')
        break
    else :
        print('CHECK COMMAND!')

server_socket.close()
   

