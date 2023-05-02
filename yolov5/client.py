import socket
import sys
from _thread import *

file_name = sys.argv[1]
plant_code = sys.argv[2]

HOST = '127.0.0.1'
PORT = 9999 - int(plant_code)
client_socket = socket.socket(socket.AF_INET,socket.SOCK_STREAM)
client_socket.connect((HOST, PORT))

message = file_name
client_socket.send(message.encode())

data = client_socket.recv(1024)
data = data.decode()
if data == 'error':
    print('error')
else :
    print(data, end = '')
client_socket.close()
