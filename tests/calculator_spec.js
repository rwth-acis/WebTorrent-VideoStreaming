/**
 * Created by Philipp on 18.05.2016.
 */
describe("given a calculator", function(){
    var calc = null;

    beforeEach(function(){
       calc = new Calculator();
    });
    describe("When adding numbers", function(){
        it(", just 5. Then current should be 5", function(){
            calc.add(5);
            expect(calc.current).toBe(5);
        });

        it(", just 10 and 15", function(){
            calc.add(10);
            calc.add(15);
            expect(calc.current).toBe(25);
        });
    });
    describe("When subtracting numbers", function(){
    });
});