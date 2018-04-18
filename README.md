# RIW12018

#### A mongodb instance is needed for DirectIndexFile and FullReverseIndex
docker run --name RIW-mongo -p 27017:27017 -d mongo

#### A rabbitmq instance is needed for communication; connection string inside RabbitWrapper
docker run -d --name RIW-rabbit-mgmt -p 15672:15672 -p 5672:5672 rabbitmq:3-management

#### Path to starting directory inside HTMLFilesFinder

#### All components must be started, order does not matter as messages persist on rabbitmq
