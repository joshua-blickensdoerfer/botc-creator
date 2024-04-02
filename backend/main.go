package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jung-kurt/gofpdf"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

type JsonFile struct {
	Factions []*Faction `json:"factions"`
}

type Faction struct {
	Name       string       `json:"name"`
	Characters []*Character `json:"characters"`
}

type Character struct {
	Name    Name   `json:"name"`
	Gender  string `json:"gender"`
	Ability string `json:"ability"`
	Script  string `json:"script"`
}

type Name struct {
	Eng string `json:"eng"`
	Ger string `json:"ger"`
}

type PostRequest struct {
	FactionId int `json:"factionId"`
	CharId    int `json:"characterId"`
}

type PdfCreate struct {
	Name string `json:"name"`
}

func (f Faction) Len() int {
	return len(f.Characters)
}

func (f Faction) Less(i, j int) bool {
	return f.Characters[i].Name.Ger < f.Characters[j].Name.Ger
}

func (f Faction) Swap(i, j int) {
	f.Characters[i], f.Characters[j] = f.Characters[j], f.Characters[i]
}

// JSON file path
const jsonFilePath = "data.json"

func loadData() JsonFile {

	jsonFile, err := os.Open(jsonFilePath)
	if err != nil {
		fmt.Println(err)
	}
	defer jsonFile.Close()
	byteValue, _ := io.ReadAll(jsonFile)
	var content JsonFile
	json.Unmarshal(byteValue, &content)
	return content
}

func readInCsv() {
	csvFile, err := os.Open("roles.csv")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer csvFile.Close()

	// Read the CSV file
	reader := csv.NewReader(csvFile)
	reader.Comma = ';'
	records, err := reader.ReadAll()
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	// Convert CSV data to JSON
	var jsonData JsonFile = JsonFile{
		Factions: []*Faction{},
	}
	var currentFaction Faction = Faction{
		Name:       "Dorbewohner*innen",
		Characters: []*Character{},
	}
	for _, record := range records {
		if record[0] == "" {
			if len(currentFaction.Characters) > 0 {
				newFaction := currentFaction
				jsonData.Factions = append(jsonData.Factions, &newFaction)
			}
			currentFaction = Faction{
				Name:       record[1],
				Characters: []*Character{},
			}
			continue
		}
		var char Character = Character{
			Name: Name{
				Eng: record[1],
				Ger: record[2],
			},
			Gender:  record[3],
			Ability: record[4],
			Script:  record[0],
		}
		currentFaction.Characters = append(currentFaction.Characters, &char)
	}

	if len(currentFaction.Characters) > 0 {
		newFaction := currentFaction
		jsonData.Factions = append(jsonData.Factions, &newFaction)
	}

	// Save JSON data to file
	jsonFile, err := os.Create("output.json")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer jsonFile.Close()

	encoder := json.NewEncoder(jsonFile)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(jsonData); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Conversion successful. JSON data saved to output.json")
}

func main() {
	//readInCsv()
	router := gin.Default()
	router.Use(cors.Default())

	leftSide := loadData()

	rightSide := JsonFile{
		Factions: []*Faction{},
	}

	for _, faction := range leftSide.Factions {
		var fac Faction = Faction{
			Name:       faction.Name,
			Characters: []*Character{},
		}
		rightSide.Factions = append(rightSide.Factions, &fac)
	}

	// Define route to get all data
	router.GET("/left", func(c *gin.Context) {

		for _, faction := range leftSide.Factions {
			sort.Sort(faction)
		}

		c.JSON(http.StatusOK, leftSide)
	})

	router.GET("/right", func(c *gin.Context) {
		c.JSON(http.StatusOK, rightSide)
	})

	router.POST("/left", func(c *gin.Context) {
		var body []*Faction
		if err := c.BindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		leftSide.Factions = body
	})

	router.POST("/right", func(c *gin.Context) {
		var body []*Faction
		if err := c.BindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		rightSide.Factions = body
	})

	router.POST("/createPDF", func(c *gin.Context) {

		var body PdfCreate
		if err := c.BindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		pdf := gofpdf.New("P", "mm", "A4", "")
		pdf.AddUTF8Font("Roboto", "", "fonts/Roboto_Condensed/static/RobotoCondensed-Light.ttf")
		pdf.AddUTF8Font("Roboto", "B", "fonts/Roboto_Condensed/static/RobotoCondensed-Regular.ttf")
		pdf.AddUTF8Font("Dumbledor", "", "fonts/dumbledor/dum1/dum1.ttf")
		pdf.AddPage()

		pdf.MoveTo(5, 2)
		heading := body.Name

		for _, faction := range rightSide.Factions {
			if len(faction.Characters) == 0 {
				continue
			}

			pdf.SetFont("Dumbledor", "", 10)
			cap := cases.Upper(language.German, cases.Compact).String(faction.Name)
			factionWidth := pdf.GetStringWidth(cap)

			if heading != "" {
				pdf.SetFont("Dumbledor", "", 16)
				pdf.Line(5, pdf.GetY()+5, 10, pdf.GetY()+5)
				headingWidth := pdf.GetStringWidth(heading)
				pdf.Line(10+headingWidth+6, pdf.GetY()+5, 180-factionWidth, pdf.GetY()+5)
				pdf.MoveTo(12, pdf.GetY())
				pdf.Cell(0, 10, heading)
				heading = ""
			} else {
				pdf.Line(5, pdf.GetY()+5, 180-factionWidth, pdf.GetY()+5)
			}

			pdf.SetFont("Dumbledor", "", 10)
			pdf.Line(175, pdf.GetY()+5, 205, pdf.GetY()+5)

			pdf.SetFillColor(170, 170, 170)
			pdf.RoundedRect(180-factionWidth, pdf.GetY()+2.5, factionWidth+15, 5, 2.5, "1234", "DF")

			pdf.MoveTo(185-factionWidth, pdf.GetY())
			pdf.Cell(0, 10, cap)

			pdf.Ln(-1)
			pdf.SetFont("Roboto", "", 8)
			for _, character := range faction.Characters {
				image := fmt.Sprintf("icons/%s.png", character.Name.Eng)
				pdf.MoveTo(5, pdf.GetY())
				if _, err := os.Stat(image); err == nil {
					pdf.Image(image, pdf.GetX(), pdf.GetY()-2.5, 12, 12, false, "", 0, "")
				} else if os.IsNotExist(err) {
					pdf.Cell(0, 0, image)
				}
				pdf.MoveTo(pdf.GetX()+12, pdf.GetY())
				pdf.SetFont("Roboto", "B", 8)
				pdf.Cell(35, 3.4, character.Name.Ger)
				pdf.SetAlpha(0.85, "Normal")
				pdf.SetFont("Roboto", "", 7)
				pdf.MoveTo(17, pdf.GetY()+2)
				pdf.Cell(35, 5, character.Name.Eng)
				pdf.MoveTo(42, pdf.GetY()-2)
				pdf.SetAlpha(1, "Normal")
				pdf.SetFont("Roboto", "", 8)
				pdf.MultiCell(158, 3.4, character.Ability, "", "", false)
				pdf.MoveTo(5, pdf.GetY()+5.6)
			}
			pdf.MoveTo(pdf.GetX(), pdf.GetY()-3)
		}

		pdf.SetFooterFunc(func() {
			pdf.SetFont("Roboto", "", 6)
			pdf.SetY(-8)
			pdf.SetX(5)
			pdf.Cell(30, 5, "\u00a9 Steven Medway, bloodontheclocktower.com - Übersetzung: Chris Blickensdörfer - Created By: Joshua Blickensdörfer")

			pdf.SetFont("Roboto", "", 8)
			mark := "* Nicht in der ersten Nacht."
			markWidth := pdf.GetStringWidth(mark)
			pdf.SetXY(204-markWidth, -8.2)
			pdf.Cell(0, 5, mark)

		})

		err := pdf.OutputFileAndClose("hello.pdf")
		if err != nil {
			panic(err)
		}
		c.JSON(http.StatusOK, gin.H{})
	})

	// Start server
	fmt.Println("Server is running on port 8080...")
	router.Run(":8080")
}
