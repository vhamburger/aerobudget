package main

import (
	"fmt"
	"log"
	"os"

	"github.com/aerobudget/aerobudget/importer"
)

func main() {
	f, err := os.Open("test-flugbuch-export.csv")
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	flights, err := importer.ParseCSV(f, importer.B4TakeoffTemplate)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Parsed %d flights\n", len(flights))
	for _, fl := range flights {
		fmt.Printf("Date: %s, Aircraft: %s, Dep: %s, Arr: %s, Block: %d min, Flight: %d min, Pilot: %s\n",
			fl.Date, fl.Aircraft, fl.Departure, fl.Arrival, fl.BlockMinutes, fl.FlightMinutes, fl.Pilot)
	}
}
