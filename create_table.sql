CREATE TABLE `mapshare` (
  `kamei_id` varchar(45) NOT NULL,
  `user` int(11) NOT NULL,
  `lat` float NOT NULL,
  `lng` float NOT NULL,
  `zoom` int(11) NOT NULL,
  `mapType` varchar(45) NOT NULL,
  `marker_count` int(11) NOT NULL,
  `marker_lastId` int(11) NOT NULL,
  `markers` longtext,
  `date` datetime NOT NULL,
  PRIMARY KEY (`kamei_id`)
) ENGINE=InnoDB;
