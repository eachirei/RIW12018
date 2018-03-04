// get array of indexes blocks
// open descriptor for each one of them
// read first line from each and extract words
// sort unique words and form a queue
// read from all blocks that contain that line and add to global index
// if word from newly read line is different than current word, add to queue and keep it sorted
// when no other descriptors have that word, get to the next in queue
// repeat till end
// every X words write a partial rev_index and its path to a ref file
// write full rev_index to file
